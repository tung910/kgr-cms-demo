import { HttpResponse, delay, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import {
  getSystemConfigParams,
  recordAudit,
} from '@/features/system/mocks/systemHandlers';
import { campaignAudienceFixtures } from '@/mocks/fixtures/campaignAudience';
import { campaignFixtures } from '@/mocks/fixtures/campaigns';
import { randomId } from '@/shared/lib/id';
import { maskName } from '@/shared/lib/mask';

import { resolveDeviceDeeplink } from '../constants/deeplinkTargets';
import { effectiveOfferDto } from '../constants/triggerOffers';
import type {
  AudienceConditions,
  AudienceCustomerDto,
  AudienceDeviceDto,
  NumberRange,
} from '../schemas/audienceSchemas';
import {
  campaignDraftInputSchema,
  type CampaignDto,
  type CampaignMetricsDto,
} from '../schemas/campaignSchemas';

// In-memory mock backend for the campaigns module (spec §7). Resets on reload.
// Authorization, the approval state machine, creator≠approver separation and
// audit logging all live here, mirroring the device/member handlers.
// Registered before the catch-all device handlers.

const roleKey = 'cms-portal:mock-auth-role'; // shared with handlers.ts
const userKey = 'cms-portal:mock-auth-user'; // shared with systemHandlers.ts

let campaignStore: CampaignDto[] = structuredClone(campaignFixtures);
const audience: AudienceCustomerDto[] = campaignAudienceFixtures;
// Historical issuance protection survives approval reset and subsequent edits.
const protectedOffers = new Set(
  campaignFixtures.filter((c) => c.approved_at !== null).map((c) => c.id)
);

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}

function error(key: string, status: number) {
  return HttpResponse.json(
    { message: i18n.t('campaigns:errors.' + key) },
    { status }
  );
}

// A lightweight audit actor from the mock session (id + a role-based name).
function actor(): { id: string; fullName: string } {
  const id = localStorage.getItem(userKey) ?? 'anonymous';
  const role = localStorage.getItem(roleKey);
  const fullName =
    role && isPortalRole(role)
      ? i18n.t(`roles.${role}`, { ns: 'common' })
      : '—';
  return { id, fullName };
}

// ---- lazy scheduling -------------------------------------------------------

// No real scheduler exists: a scheduled campaign "activates" when read after
// its window opens, and a running one ends after its window closes.
function materialize(campaign: CampaignDto): CampaignDto {
  const now = Date.now();
  const before = campaign.status;
  if (
    campaign.status === 'approved' &&
    campaign.schedule_type === 'scheduled' &&
    campaign.starts_at &&
    Date.parse(campaign.starts_at) <= now
  ) {
    campaign.status = 'running';
    campaign.updated_at = new Date().toISOString();
  }
  if (
    campaign.status === 'running' &&
    campaign.ends_at &&
    Date.parse(campaign.ends_at) <= now
  ) {
    campaign.status = 'ended';
    campaign.updated_at = new Date().toISOString();
  }
  if (before !== campaign.status)
    recordAudit(null, {
      module: 'campaigns',
      action: 'schedule',
      target: campaign.id,
      before: { status: before },
      after: { status: campaign.status },
      reason: i18n.t('campaigns:history.scheduler'),
      actorName: i18n.t('campaigns:history.scheduler'),
    });
  return campaign;
}

function materializeAll(): CampaignDto[] {
  const campaigns = campaignStore.map(materialize);
  // Higher priority wins; oldest campaign wins a tie, independently of read order.
  campaigns
    .filter((c) => c.status === 'running')
    .sort(
      (a, b) =>
        b.priority - a.priority || a.created_at.localeCompare(b.created_at)
    )
    .forEach(dispatch);
  return campaigns;
}

// ---- audience segmentation (spec 7.2) --------------------------------------

function inRange(value: number, range?: NumberRange): boolean {
  if (!range) return true;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

function matchingDevices(
  customer: AudienceCustomerDto,
  c: AudienceConditions
): AudienceDeviceDto[] {
  const tenureDays = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(customer.first_activated_at)) / DAY_MS)
  );
  if (
    !inRange(customer.loyalty_points, c.loyaltyPoints) ||
    !inRange(tenureDays, c.tenureDays)
  )
    return [];
  // All installation/device conditions must hold on the same owned device.
  // Telemetry conditions (firmware, core days, regional TDS) come from a live
  // cloud link, so a non-IoT unit can never satisfy them: setting any of these
  // conditions excludes non-IoT devices, while registration/commerce conditions
  // (region, model, warranty by purchase date) still reach them.
  return customer.devices.filter((device) => {
    if (c.regions.length && !c.regions.includes(device.region)) return false;
    if (c.models.length && !c.models.includes(device.model_name)) return false;
    if (
      c.connectivities.length &&
      !c.connectivities.includes(device.connectivity)
    )
      return false;
    if (
      c.warrantyStatuses.length &&
      !c.warrantyStatuses.includes(device.warranty_status)
    )
      return false;
    const telemetryConstrained =
      c.firmwareVersions.length > 0 || !!c.coreRemainingDays || !!c.regionTds;
    if (telemetryConstrained && device.connectivity !== 'iot') return false;
    if (
      c.firmwareVersions.length &&
      !c.firmwareVersions.includes(device.firmware_version)
    )
      return false;
    if (!inRange(device.core_remaining_days, c.coreRemainingDays)) return false;
    if (!inRange(device.region_tds, c.regionTds)) return false;
    return true;
  });
}

// Opted-out customers (spec 7.7.a) are hard-excluded from every audience —
// manual campaigns and triggers alike — before any condition is evaluated.
function isContactable(customer: AudienceCustomerDto): boolean {
  return customer.opt_in;
}

function countAudience(conditions: AudienceConditions): AudienceCustomerDto[] {
  return audience.filter(
    (customer) =>
      isContactable(customer) &&
      matchingDevices(customer, conditions).length > 0 &&
      sends.filter(
        (s) =>
          s.customerId === customer.customer_id &&
          s.sentAt >
            Date.now() -
              getSystemConfigParams().campaign_frequency_days * DAY_MS
      ).length < getSystemConfigParams().campaign_frequency_limit
  );
}

// shortcut: lazy in-memory dispatch, replace with a durable scheduler for production.
const sends: Array<{
  campaignId: string;
  customerId: string;
  deviceId: string;
  deeplink: string | null;
  secondaryDeeplink: string | null;
  sentAt: number;
  sendId: string;
  failed: boolean;
  clickedAt: number | null;
  opened: boolean;
  voucherCode: string | null;
}> = [];
const DAY_MS = 86_400_000;
function dispatch(campaign: CampaignDto): void {
  const now = Date.now();
  const config = getSystemConfigParams();
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now)
  );
  const start = config.campaign_quiet_start_hour,
    end = config.campaign_quiet_end_hour;
  if (
    campaign.channel === 'push' &&
    (start > end ? hour >= start || hour < end : hour >= start && hour < end)
  )
    return;
  const recipients = countAudience(campaign.audience);
  for (const customer of recipients) {
    const device = matchingDevices(customer, campaign.audience)
      .filter((candidate) => {
        if (campaign.kind !== 'trigger') return true;
        switch (campaign.trigger_preset) {
          // Sensor-driven triggers only fire on connected (IoT) devices.
          case 'core_due':
            return (
              candidate.connectivity === 'iot' &&
              candidate.core_remaining_days <= config.campaign_core_days
            );
          case 'high_tds':
            return (
              candidate.connectivity === 'iot' &&
              candidate.region_tds >= config.tds_threshold_region
            );
          // Date/commerce-driven triggers reach non-IoT products too.
          case 'warranty_expiring':
            return (
              candidate.warranty_remaining_days >= 0 &&
              candidate.warranty_remaining_days <= config.warranty_expiring_days
            );
          case 'repurchase_due':
            return (
              candidate.last_core_purchase_days_ago >=
              config.campaign_repurchase_days
            );
          default:
            return false;
        }
      })
      .sort((a, b) => a.device_id.localeCompare(b.device_id))[0];
    if (!device) continue;
    const history = sends.filter(
      (s) =>
        s.customerId === customer.customer_id &&
        s.sentAt > now - config.campaign_frequency_days * DAY_MS
    );
    const own = sends.filter(
      (s) =>
        s.campaignId === campaign.id && s.customerId === customer.customer_id
    );
    if (
      history.length >= config.campaign_frequency_limit ||
      own.filter(
        (s) => s.sentAt > now - config.campaign_frequency_days * DAY_MS
      ).length >= campaign.frequency_cap_per_customer
    )
      continue;
    // Manual campaigns send once; trigger repeats are separated by cooldown.
    if (
      own.some(
        (s) =>
          campaign.kind === 'manual' ||
          s.sentAt > now - config.campaign_cooldown_days * DAY_MS
      )
    )
      continue;
    // The offer that ships: the author's, or the trigger's automatic upsell
    // (e.g. a `high_tds` core voucher) when none was attached by hand.
    const offer = effectiveOfferDto(campaign);
    sends.push({
      campaignId: campaign.id,
      customerId: customer.customer_id,
      deviceId: device.device_id,
      deeplink: resolveDeviceDeeplink(campaign.deeplink, device.device_id),
      secondaryDeeplink: resolveDeviceDeeplink(
        campaign.secondary_deeplink,
        device.device_id
      ),
      sentAt: now,
      opened: hashId(campaign.id + ':' + customer.customer_id) % 10 < 6,
      clickedAt:
        hashId(campaign.id + ':' + customer.customer_id) % 10 < 3 ? now : null,
      voucherCode:
        offer?.type === 'voucher'
          ? offer.codeMode === 'shared'
            ? (offer.voucherCode ?? null)
            : (offer.voucherCode ?? campaign.id) + '-' + customer.customer_id
          : null,
      sendId: `${campaign.tenant_id}:${campaign.id}:${customer.customer_id}:${own.length}`,
      failed: hashId(`${campaign.id}:${customer.customer_id}`) % 20 === 0,
    });
  }
}

// ---- metrics (spec 7.6) ----------------------------------------------------

function hashId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

// Deterministic metrics so the same campaign always reports the same figures.
function metricsFor(campaign: CampaignDto): CampaignMetricsDto {
  const attempts = sends.filter((s) => s.campaignId === campaign.id);
  const sent = attempts.length;
  const failed = attempts.filter((s) => s.failed).length;
  const delivered = sent - failed;
  const opened = attempts.filter((s) => !s.failed && s.opened).length;
  const clicked = attempts.filter(
    (s) => !s.failed && s.clickedAt !== null
  ).length;
  const config = getSystemConfigParams();
  // Fabricated net orders, deduped per customer/type; last successful click wins.
  const orders = new Map<
    string,
    { customerId: string; at: number; kind: 'booking' | 'qr' }
  >();
  for (const send of sends) {
    const seed = hashId(send.customerId);
    if (seed % 3 !== 0) continue;
    const kind = seed % 2 === 0 ? 'booking' : 'qr';
    const key = send.customerId + ':' + kind;
    if (!orders.has(key))
      orders.set(key, {
        customerId: send.customerId,
        at: send.sentAt + (seed % 9) * DAY_MS,
        kind,
      });
  }
  let conversionsBooking = 0,
    conversionsQr = 0;
  for (const order of orders.values()) {
    if (order.at > Date.now()) continue;
    const lastClick = sends
      .filter(
        (s) =>
          s.customerId === order.customerId &&
          !s.failed &&
          s.clickedAt !== null &&
          s.clickedAt <= order.at &&
          order.at - s.clickedAt <= config.campaign_attribution_days * DAY_MS
      )
      .sort(
        (a, b) =>
          (b.clickedAt ?? 0) - (a.clickedAt ?? 0) ||
          b.sendId.localeCompare(a.sendId)
      )[0];
    if (lastClick?.campaignId !== campaign.id) continue;
    if (order.kind === 'booking') conversionsBooking++;
    else conversionsQr++;
  }

  const revenue =
    conversionsBooking * config.campaign_booking_revenue +
    conversionsQr * config.campaign_qr_revenue;
  return {
    send_id: `${campaign.tenant_id}:${campaign.id}`,
    attribution_model: 'last_click',
    attribution_window_days: config.campaign_attribution_days,
    failed,
    failure_reason: failed ? 'mock_provider_unavailable' : null,
    sent,
    delivered,
    opened,
    clicked,
    conversions_booking: conversionsBooking,
    conversions_qr: conversionsQr,
    revenue,
  };
}

// ---- pagination / filtering ------------------------------------------------

function filterCampaigns(url: URL): CampaignDto[] {
  const search = url.searchParams.get('search')?.trim().toLocaleLowerCase();
  const status = url.searchParams.get('status')?.trim();
  const kind = url.searchParams.get('kind')?.trim();
  return materializeAll()
    .filter(
      (campaign) =>
        (!search ||
          campaign.name.toLocaleLowerCase().includes(search) ||
          campaign.id.toLocaleLowerCase().includes(search)) &&
        (!status || campaign.status === status) &&
        (!kind || campaign.kind === kind)
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function pageOf<T>(url: URL, items: readonly T[]) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Number(url.searchParams.get('page_size')) || 10);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total: items.length,
  };
}

function find(id: string): CampaignDto | undefined {
  const campaign = materializeAll().find((item) => item.id === id);
  return campaign ? materialize(campaign) : undefined;
}

// ---- transitions (spec 7.5) ------------------------------------------------

type TransitionAction =
  'submit' | 'approve' | 'reject' | 'run' | 'stop' | 'pause' | 'resume';

// Spec 7.5 separates "duyệt" (approve/reject) from "cho chạy/dừng" (run/stop):
// run and stop are gated by campaign.send, not campaign.approve.
const TRANSITION_CAPABILITY: Record<TransitionAction, Capability> = {
  submit: 'campaign.write',
  approve: 'campaign.approve',
  reject: 'campaign.approve',
  run: 'campaign.send',
  stop: 'campaign.send',
  pause: 'campaign.send',
  resume: 'campaign.send',
};

// (action, fromStatus) -> toStatus. Any pair absent here is an invalid move.
function nextStatus(
  action: TransitionAction,
  from: CampaignDto['status']
): CampaignDto['status'] | null {
  switch (action) {
    case 'submit':
      return from === 'draft' || from === 'rejected'
        ? 'pending_approval'
        : null;
    case 'approve':
      return from === 'pending_approval' ? 'approved' : null;
    case 'reject':
      return from === 'pending_approval' ? 'rejected' : null;
    case 'run':
      return from === 'approved' ? 'running' : null;
    case 'pause':
    case 'stop':
      return from === 'running' ? 'paused' : null;
    case 'resume':
      return from === 'paused' ? 'running' : null;
  }
}

export const campaignHandlers = [
  http.get('/api/campaigns', ({ request }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    return HttpResponse.json(
      pageOf(new URL(request.url), filterCampaigns(new URL(request.url)))
    );
  }),

  http.get('/api/campaigns/counts', ({ request }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim().toLocaleLowerCase();
    const kind = url.searchParams.get('kind')?.trim();
    // Status breakdown ignores the status filter so every card shows its total.
    const items = materializeAll().filter(
      (campaign) =>
        (!search ||
          campaign.name.toLocaleLowerCase().includes(search) ||
          campaign.id.toLocaleLowerCase().includes(search)) &&
        (!kind || campaign.kind === kind)
    );
    const by = (status: CampaignDto['status']) =>
      items.filter((campaign) => campaign.status === status).length;
    return HttpResponse.json({
      total: items.length,
      draft: by('draft'),
      pending_approval: by('pending_approval'),
      approved: by('approved'),
      running: by('running'),
      paused: by('paused'),
      ended: by('ended'),
      rejected: by('rejected'),
    });
  }),

  http.post('/api/campaigns', async ({ request }) => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    const parsed = campaignDraftInputSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) return error('validation', 422);
    const input = parsed.data;
    if (input.offer && !allowed('campaign.voucher.create'))
      return error('forbidden', 403);
    if (
      input.frequencyCapPerCustomer !== 1 &&
      !allowed('campaign.frequency.config')
    )
      return error('forbidden', 403);
    const who = actor();
    const now = new Date().toISOString();
    const campaign: CampaignDto = {
      id: `CMP-${randomId().slice(0, 6).toUpperCase()}`,
      priority: input.priority,
      tenant_id: input.tenantId,
      name: input.name,
      kind: input.kind,
      channel: input.channel,
      content_vi: input.contentVi,
      content_en: input.contentEn,
      image_url: input.imageUrl,
      deeplink: input.deeplink,
      secondary_deeplink: input.secondaryDeeplink,
      schedule_type: input.scheduleType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: 'draft',
      trigger_preset: input.triggerPreset,
      frequency_cap_per_customer: input.frequencyCapPerCustomer,
      audience: input.audience,
      audience_count: input.audienceCount,
      offer: input.offer,
      created_by: who.id,
      created_by_name: who.fullName,
      created_at: now,
      updated_at: now,
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      rejected_reason: null,
    };
    campaignStore = [campaign, ...campaignStore];
    recordAudit(who, {
      module: 'campaigns',
      action: 'create',
      target: campaign.id,
      before: null,
      after: structuredClone(campaign),
      reason: input.reason,
    });
    if (campaign.offer)
      recordAudit(who, {
        module: 'campaigns',
        action: 'voucher_attach',
        target: campaign.id,
        before: null,
        after: { offer: structuredClone(campaign.offer) },
        reason: input.reason,
      });
    return HttpResponse.json(campaign, { status: 201 });
  }),

  http.post('/api/campaigns/audience/preview', async ({ request }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const parsed = campaignDraftInputSchema.shape.audience.safeParse(
      (await request.json().catch(() => null)) as unknown
    );
    if (!parsed.success) return error('validation', 422);
    await delay(300);
    const matched = countAudience(parsed.data);
    // How many matched customers were reached through a non-IoT device — the
    // breakdown shown next to the total so the segment's offline reach is visible.
    const matchedNonIot = matched.filter((customer) =>
      matchingDevices(customer, parsed.data).some(
        (device) => device.connectivity === 'non_iot'
      )
    ).length;
    // PII mask (NĐ 13, spec 7.7.b): roles without device.pii.full see customer
    // names masked in the preview sample — the same gate the device/owner
    // screens use, so API, UI and any export stay consistent.
    const piiFull = allowed('device.pii.full');
    const sample = matched.slice(0, 5).map((customer) => ({
      ...customer,
      tenure_days: Math.max(
        0,
        Math.floor(
          (Date.now() - Date.parse(customer.first_activated_at)) / DAY_MS
        )
      ),
      name: piiFull ? customer.name : maskName(customer.name),
    }));
    return HttpResponse.json({
      total: audience.length,
      matched: matched.length,
      matched_non_iot: matchedNonIot,
      sample,
      pii_masked: !piiFull,
    });
  }),

  http.get('/api/campaigns/:id', ({ params }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const campaign = find(String(params.id));
    if (!campaign) return error('not_found', 404);
    return HttpResponse.json(campaign);
  }),

  http.put('/api/campaigns/:id', async ({ params, request }) => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    const index = campaignStore.findIndex((item) => item.id === params.id);
    if (index === -1) return error('not_found', 404);
    const current = campaignStore[index]!;
    if (current.status === 'ended') {
      return error('not_editable', 409);
    }
    const parsed = campaignDraftInputSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) return error('validation', 422);
    const input = parsed.data;
    if (
      input.frequencyCapPerCustomer !== current.frequency_cap_per_customer &&
      !allowed('campaign.frequency.config')
    )
      return error('forbidden', 403);
    const offerChanged =
      JSON.stringify(current.offer) !== JSON.stringify(input.offer);
    if (
      offerChanged &&
      !allowed(
        current.offer &&
          (protectedOffers.has(current.id) ||
            sends.some((s) => s.campaignId === current.id))
          ? 'campaign.voucher.update'
          : 'campaign.voucher.create'
      )
    )
      return error('forbidden', 403);
    const updated: CampaignDto = {
      ...current,
      tenant_id: input.tenantId,
      priority: input.priority,
      status: ['approved', 'running', 'paused'].includes(current.status)
        ? 'pending_approval'
        : current.status,
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      name: input.name,
      kind: input.kind,
      channel: input.channel,
      content_vi: input.contentVi,
      content_en: input.contentEn,
      image_url: input.imageUrl,
      deeplink: input.deeplink,
      secondary_deeplink: input.secondaryDeeplink,
      schedule_type: input.scheduleType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      trigger_preset: input.triggerPreset,
      frequency_cap_per_customer: input.frequencyCapPerCustomer,
      audience: input.audience,
      audience_count: input.audienceCount,
      offer: input.offer,
      updated_at: new Date().toISOString(),
    };
    campaignStore[index] = updated;
    recordAudit(actor(), {
      module: 'campaigns',
      action: 'update',
      target: updated.id,
      before: structuredClone(current),
      after: structuredClone(updated),
      reason: input.reason,
    });
    if (offerChanged)
      recordAudit(actor(), {
        module: 'campaigns',
        action: 'voucher_update',
        target: updated.id,
        before: { offer: structuredClone(current.offer) },
        after: { offer: structuredClone(updated.offer) },
        reason: input.reason,
      });
    return HttpResponse.json(updated);
  }),

  http.post('/api/campaigns/:id/transition', async ({ params, request }) => {
    const body = (await request.json().catch(() => null)) as {
      action?: TransitionAction;
      reason?: string;
    } | null;
    const action = body?.action;
    if (
      action !== 'submit' &&
      action !== 'approve' &&
      action !== 'reject' &&
      action !== 'run' &&
      action !== 'pause' &&
      action !== 'resume' &&
      action !== 'stop'
    ) {
      return error('validation', 422);
    }
    if (!allowed(TRANSITION_CAPABILITY[action])) return error('forbidden', 403);

    const index = campaignStore.findIndex((item) => item.id === params.id);
    if (index === -1) return error('not_found', 404);
    const current = materialize(campaignStore[index]!);

    const to = nextStatus(action, current.status);
    if (!to) return error('invalid_transition', 409);

    // Reason is mandatory when approving, rejecting or stopping.
    const reason = body?.reason?.trim() || null;
    if (!reason) {
      return error('reason_required', 422);
    }

    const who = actor();
    // Creator ≠ approver: the person who created it cannot approve/reject it.
    if (
      (action === 'approve' || action === 'reject') &&
      who.id === current.created_by
    ) {
      return error('self_approve', 403);
    }

    const before = { status: current.status };
    current.status = to;
    current.updated_at = new Date().toISOString();
    if (action === 'approve') {
      protectedOffers.add(current.id);
      current.approved_by = who.id;
      current.approved_by_name = who.fullName;
      current.approved_at = current.updated_at;
      current.rejected_reason = null;
    }
    if (action === 'reject') current.rejected_reason = reason;
    if (action === 'run' && current.schedule_type === 'send_now') {
      current.starts_at = current.starts_at ?? current.updated_at;
    }

    campaignStore[index] = current;

    recordAudit(who, {
      module: 'campaigns',
      action,
      target: current.id,
      before,
      after: { status: to },
      reason,
    });
    return HttpResponse.json(current);
  }),

  http.get('/api/campaigns/:id/metrics', ({ params }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const campaign = find(String(params.id));
    if (!campaign) return error('not_found', 404);
    return HttpResponse.json(metricsFor(campaign));
  }),

  http.post('/api/campaigns/:id/test-send', async ({ params }) => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    const campaign = find(String(params.id));
    if (!campaign) return error('not_found', 404);
    await delay(400);
    recordAudit(actor(), {
      module: 'campaigns',
      action: 'test_send',
      target: campaign.id,
    });
    return HttpResponse.json({ ok: true });
  }),
];
