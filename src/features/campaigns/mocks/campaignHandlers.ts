import { HttpResponse, delay, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import {
  getSystemConfigParams,
  listMembersWithCapability,
  recordAudit,
} from '@/features/system/mocks/systemHandlers';
import { campaignAudienceFixtures } from '@/mocks/fixtures/campaignAudience';
import { campaignFixtures } from '@/mocks/fixtures/campaigns';
import { countCampaignPurchases } from '@/mocks/stores/entitlementStore';
import {
  isGrantablePackage,
  packageStore,
} from '@/mocks/stores/servicePackageStore';
import { randomId } from '@/shared/lib/id';
import { maskName } from '@/shared/lib/mask';
import type { ServicePackageDto } from '@/features/service-packages/schemas/servicePackageSchemas';

import { mapPromotedPackage } from '../api/campaignMapper';
import { buttonDeeplink } from '../constants/campaignCta';
import { resolveDeviceDeeplink } from '../constants/deeplinkTargets';
import {
  audienceDefinitionSchema,
  type AudienceConditions,
  type AudienceCustomerDto,
  type AudienceDefinition,
  type AudienceDeviceDto,
  type NumberRange,
} from '../schemas/audienceSchemas';
import {
  CAMPAIGN_TRANSITIONS,
  campaignDraftInputSchema,
  type CampaignDto,
  type CampaignMetricsDto,
  type CampaignOffer,
  type CampaignTransition,
  type PromotedPackageDto,
} from '../schemas/campaignSchemas';
import {
  firstPeriodPrice,
  validatePackageOffer,
} from '../utils/packagePricing';

// In-memory mock backend for the campaigns module (spec §7). Resets on reload.
// Authorization, the approval state machine, creator≠approver separation and
// audit logging all live here, mirroring the device/member handlers.
// Registered before the catch-all device handlers.

const roleKey = 'cms-portal:mock-auth-role'; // shared with handlers.ts
const userKey = 'cms-portal:mock-auth-user'; // shared with systemHandlers.ts

const DAY_MS = 86_400_000;

let campaignStore: CampaignDto[] = structuredClone(campaignFixtures);
const audience: AudienceCustomerDto[] = campaignAudienceFixtures;

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}

function error(key: string, status: number) {
  return HttpResponse.json(
    { code: key, message: i18n.t('campaigns:errors.' + key) },
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

function hashId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

// ---- promoted package (campaign spec §4–§5) ---------------------------------

// Catalogue summary of a package as campaign screens see it. Bundles are never
// promotable, so they are reported as not grantable.
export function toPromotedPackageDto(
  pkg: ServicePackageDto
): PromotedPackageDto {
  return {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    group: pkg.group,
    status: pkg.status,
    grantable: isGrantablePackage(pkg) && pkg.group !== 'bundle',
    billing_type: pkg.billing_type,
    price: pkg.price,
    billing_period_months: pkg.billing_period_months,
    pricing_mode: pkg.pricing_mode ?? 'fixed',
    term_months: pkg.term_months,
  };
}

function promotedPackageOf(id: string | null): PromotedPackageDto | null {
  const pkg = id ? packageStore.find((item) => item.id === id) : undefined;
  return pkg ? toPromotedPackageDto(pkg) : null;
}

// The stored campaign keeps only the package reference; the summary is read
// from the live catalogue on every response so an archived package shows up.
function withPackage(campaign: CampaignDto): CampaignDto {
  return {
    ...campaign,
    promoted_package: promotedPackageOf(campaign.promoted_package_id),
  };
}

function packageGrantable(id: string | null): boolean {
  return id === null || !!promotedPackageOf(id)?.grantable;
}

// A draft may only promote a grantable package, and its voucher must fit the
// package's pricing (free/bundled: none; quotation: percent only; amount ≤ one
// period).
function packageInputError(
  packageId: string | null,
  offer: CampaignOffer | null
) {
  if (packageId === null) return null;
  const pkg = promotedPackageOf(packageId);
  if (!pkg?.grantable) return error('package_unavailable', 422);
  if (validatePackageOffer(mapPromotedPackage(pkg), offer))
    return error('invalid_package_offer', 422);
  return null;
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

type DevicePredicate = (
  customer: AudienceCustomerDto,
  device: AudienceDeviceDto
) => boolean;

// Telemetry conditions (firmware, core days, regional TDS) come from a live
// cloud link, so a non-IoT unit can never satisfy them; registration/commerce
// conditions (region, model, warranty by purchase date) still reach it.
function predicatesOf(c: AudienceConditions): DevicePredicate[] {
  const list: DevicePredicate[] = [];
  if (c.regions.length) list.push((_, d) => c.regions.includes(d.region));
  if (c.models.length) list.push((_, d) => c.models.includes(d.model_name));
  if (c.warrantyStatuses.length)
    list.push((_, d) => c.warrantyStatuses.includes(d.warranty_status));
  if (c.usageTypes.length)
    list.push((_, d) => c.usageTypes.includes(d.usage_type));
  if (c.connectivities.length)
    list.push((_, d) => c.connectivities.includes(d.connectivity));
  if (c.firmwareVersions.length)
    list.push(
      (_, d) =>
        d.connectivity === 'iot' &&
        c.firmwareVersions.includes(d.firmware_version)
    );
  if (c.coreRemainingDays)
    list.push(
      (_, d) =>
        d.connectivity === 'iot' &&
        inRange(d.core_remaining_days, c.coreRemainingDays)
    );
  if (c.regionTds)
    list.push(
      (_, d) => d.connectivity === 'iot' && inRange(d.region_tds, c.regionTds)
    );
  if (c.loyaltyPoints)
    list.push((customer) => inRange(customer.loyalty_points, c.loyaltyPoints));
  return list;
}

function matchingDevices(
  customer: AudienceCustomerDto,
  c: AudienceConditions
): AudienceDeviceDto[] {
  const predicates = predicatesOf(c);
  const matched =
    predicates.length === 0
      ? customer.devices
      : customer.devices.filter((device) =>
          c.logic === 'or'
            ? predicates.some((p) => p(customer, device))
            : predicates.every((p) => p(customer, device))
        );
  // Excluding devices that already hold the promoted package is an AND on top
  // of the and/or conditions, so it also holds when the logic is `or`.
  const excluded = c.excludeActivePackageId;
  return excluded
    ? matched.filter((device) => !device.active_package_ids.includes(excluded))
    : matched;
}

// shortcut: lazy in-memory dispatch, replace with a durable scheduler for production.
const sends: Array<{
  campaignId: string;
  customerId: string;
  deviceId: string;
  deeplink: string | null;
  sentAt: number;
  sendId: string;
  failed: boolean;
  clickedAt: number | null;
  opened: boolean;
  voucherCode: string | null;
}> = [];

function recentSends(customerId: string, windowMs: number) {
  const since = Date.now() - windowMs;
  return sends.filter((s) => s.customerId === customerId && s.sentAt > since);
}

// Customers who satisfy the conditions (`eligible`) and, of those, the ones who
// will really get the message: opted-out customers (spec 7.7.a) are always
// removed, then the author's exclusions and the global frequency cap apply.
function evaluateAudience(definition: AudienceDefinition): {
  eligible: AudienceCustomerDto[];
  recipients: AudienceCustomerDto[];
} {
  const { conditions, suppression } = definition;
  const config = getSystemConfigParams();
  const eligible = audience.filter(
    (customer) => matchingDevices(customer, conditions).length > 0
  );
  const recipients = eligible.filter((customer) => {
    if (!customer.opt_in) return false;
    if (suppression.testAccounts && customer.is_test) return false;
    if (
      suppression.recentCampaign &&
      recentSends(customer.customer_id, DAY_MS).length
    )
      return false;
    return (
      recentSends(customer.customer_id, config.campaign_frequency_days * DAY_MS)
        .length < config.campaign_frequency_limit
    );
  });
  return { eligible, recipients };
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function nowMinutesInVietnam(): number {
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(Date.now());
  return toMinutes(text);
}

function inQuietHours(from: number, to: number): boolean {
  const now = nowMinutesInVietnam();
  return from > to ? now >= from || now < to : now >= from && now < to;
}

function dispatch(campaign: CampaignDto): void {
  // A campaign promoting an archived/unconfigured package must not go out.
  if (!packageGrantable(campaign.promoted_package_id)) return;
  const now = Date.now();
  if (
    (campaign.starts_at && Date.parse(campaign.starts_at) > now) ||
    (campaign.ends_at && Date.parse(campaign.ends_at) <= now)
  )
    return;
  const config = getSystemConfigParams();
  const trigger = campaign.trigger_config;
  // Quiet hours only silence push; banners and popups show on app open.
  const quiet = trigger
    ? [toMinutes(trigger.quietFrom), toMinutes(trigger.quietTo)]
    : [
        config.campaign_quiet_start_hour * 60,
        config.campaign_quiet_end_hour * 60,
      ];
  if (
    campaign.display_type === 'push' &&
    inQuietHours(quiet[0] ?? 0, quiet[1] ?? 0)
  )
    return;
  const { recipients } = evaluateAudience({
    conditions: campaign.audience,
    dedupe: campaign.dedupe,
    suppression: campaign.suppression,
  });
  const cooldownDays = trigger?.cooldownDays ?? config.campaign_cooldown_days;
  for (const customer of recipients) {
    const devices = matchingDevices(customer, campaign.audience)
      .filter((candidate) => {
        if (campaign.kind !== 'trigger') return true;
        // Never remind a device that already holds the promoted package,
        // whatever the exit-rule toggles say.
        if (
          campaign.promoted_package_id &&
          candidate.active_package_ids.includes(campaign.promoted_package_id)
        )
          return false;
        // Exit rule: a core bought recently means the reminder is moot.
        if (
          trigger?.exitOnPurchase &&
          candidate.last_core_purchase_days_ago < cooldownDays + 7
        )
          return false;
        switch (campaign.trigger_preset) {
          // Sensor-driven triggers only fire on connected (IoT) devices.
          case 'core_due':
            return (
              candidate.connectivity === 'iot' &&
              candidate.core_remaining_days <=
                (trigger?.coreDays ?? config.campaign_core_days)
            );
          case 'high_tds':
            return (
              candidate.connectivity === 'iot' &&
              candidate.region_tds >= config.tds_threshold_region
            );
          // Date-driven trigger reaches non-IoT products too.
          case 'warranty_expiring':
            return (
              candidate.warranty_remaining_days >= 0 &&
              candidate.warranty_remaining_days <= config.warranty_expiring_days
            );
          default:
            return false;
        }
      })
      .sort((a, b) => a.device_id.localeCompare(b.device_id));
    // De-dupe: one message per account, or one per matching device.
    const targets =
      campaign.dedupe === 'device' ? devices : devices.slice(0, 1);
    for (const device of targets) {
      const history = recentSends(
        customer.customer_id,
        config.campaign_frequency_days * DAY_MS
      );
      const own = sends.filter(
        (s) =>
          s.campaignId === campaign.id &&
          s.customerId === customer.customer_id &&
          (campaign.dedupe === 'account' || s.deviceId === device.device_id)
      );
      if (
        history.length >= config.campaign_frequency_limit ||
        own.filter(
          (s) => s.sentAt > now - config.campaign_frequency_days * DAY_MS
        ).length >= campaign.frequency_cap_per_customer
      )
        continue;
      // Manual campaigns send once; trigger repeats are separated by cooldown
      // and stop at the author's maximum.
      if (campaign.kind === 'manual' && own.length > 0) continue;
      if (
        campaign.kind === 'trigger' &&
        (own.length >= (trigger?.maxSends ?? 1) ||
          own.some((s) => s.sentAt > now - cooldownDays * DAY_MS))
      )
        continue;
      const seed = hashId(campaign.id + ':' + customer.customer_id);
      sends.push({
        campaignId: campaign.id,
        customerId: customer.customer_id,
        deviceId: device.device_id,
        deeplink: resolveDeviceDeeplink(
          campaign.buttons[0]
            ? buttonDeeplink(campaign.buttons[0], campaign.promoted_package_id)
            : null,
          device.device_id
        ),
        sentAt: now,
        opened: seed % 10 < 6,
        clickedAt: seed % 10 < 3 ? now : null,
        voucherCode:
          campaign.offer?.type === 'voucher'
            ? (campaign.offer.voucherCode ?? null)
            : null,
        sendId: `${campaign.tenant_id}:${campaign.id}:${customer.customer_id}:${own.length}`,
        failed: hashId(`${campaign.id}:${customer.customer_id}`) % 20 === 0,
      });
    }
  }
}

// ---- metrics (spec 7.7) ----------------------------------------------------

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

  // Packages bought through the campaign count as orders; recurring packages
  // contribute their first (voucher-discounted) period only.
  const promoted = promotedPackageOf(campaign.promoted_package_id);
  const packagePurchases = promoted ? countCampaignPurchases(campaign.id) : 0;
  const packageRevenue = promoted
    ? packagePurchases *
      (firstPeriodPrice(mapPromotedPackage(promoted), campaign.offer) ?? 0)
    : 0;
  const revenue =
    conversionsBooking * config.campaign_booking_revenue +
    conversionsQr * config.campaign_qr_revenue +
    packageRevenue;
  const suppressedOptOut = audience.filter(
    (customer) =>
      !customer.opt_in &&
      matchingDevices(customer, campaign.audience).length > 0
  ).length;
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
    orders: conversionsBooking + conversionsQr + packagePurchases,
    revenue,
    suppressed_opt_out: suppressedOptOut,
    package_purchases: packagePurchases,
    package_revenue: packageRevenue,
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

// Spec 7.5 separates "duyệt" (approve/reject) from "cho chạy/dừng" (run/stop):
// run and stop are gated by campaign.send, not campaign.approve.
const TRANSITION_CAPABILITY: Record<CampaignTransition, Capability> = {
  submit: 'campaign.write',
  approve: 'campaign.approve',
  reject: 'campaign.approve',
  run: 'campaign.send',
  stop: 'campaign.send',
  pause: 'campaign.send',
  resume: 'campaign.send',
};

// (action, fromStatus) -> toStatus. Any pair absent here is an invalid move.
// A rejected campaign goes back to draft so its author can fix and resubmit.
function nextStatus(
  action: CampaignTransition,
  from: CampaignDto['status']
): CampaignDto['status'] | null {
  switch (action) {
    case 'submit':
      return from === 'draft' ? 'pending_approval' : null;
    case 'approve':
      return from === 'pending_approval' ? 'approved' : null;
    case 'reject':
      return from === 'pending_approval' ? 'draft' : null;
    case 'run':
      return from === 'approved' ? 'running' : null;
    case 'pause':
      return from === 'running' ? 'paused' : null;
    case 'resume':
      return from === 'paused' ? 'running' : null;
    case 'stop':
      return from === 'running' || from === 'paused' ? 'ended' : null;
  }
}

// What a campaign needs before it can be sent for approval.
function isComplete(campaign: CampaignDto): boolean {
  if (!campaign.title.trim() || !campaign.content.trim()) return false;
  if (campaign.audience_count === null) return false;
  if (campaign.kind === 'trigger')
    return !!campaign.trigger_preset && !!campaign.trigger_config;
  return campaign.schedule_type === 'send_now' || !!campaign.starts_at;
}

export const campaignHandlers = [
  http.get('/api/campaigns', ({ request }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const url = new URL(request.url);
    const page = pageOf(url, filterCampaigns(url));
    return HttpResponse.json({ ...page, items: page.items.map(withPackage) });
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
    });
  }),

  // Registered before `/campaigns/:id` so "approvers" is not read as an id.
  http.get('/api/campaigns/approvers', () => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    const who = actor();
    return HttpResponse.json(
      listMembersWithCapability('campaign.approve').filter(
        (member) => member.id !== who.id
      )
    );
  }),

  // Packages a campaign can promote; registered before `/campaigns/:id`.
  http.get('/api/campaigns/package-options', () => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    return HttpResponse.json(
      packageStore
        .map(toPromotedPackageDto)
        .filter((pkg) => pkg.grantable && pkg.group !== 'bundle')
    );
  }),

  http.post('/api/campaigns/audience/preview', async ({ request }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const parsed = audienceDefinitionSchema.safeParse(
      (await request.json().catch(() => null)) as unknown
    );
    if (!parsed.success) return error('validation', 422);
    await delay(300);
    const { eligible, recipients } = evaluateAudience(parsed.data);
    // How many recipients were reached through a non-IoT device — the
    // breakdown shown next to the total so the segment's offline reach is visible.
    const matchedNonIot = recipients.filter((customer) =>
      matchingDevices(customer, parsed.data.conditions).some(
        (device) => device.connectivity === 'non_iot'
      )
    ).length;
    // PII mask (NĐ 13, spec 7.7.b): roles without device.pii.full see customer
    // names masked in the preview sample — the same gate the device/owner
    // screens use, so API, UI and any export stay consistent.
    const piiFull = allowed('device.pii.full');
    const sample = recipients.slice(0, 5).map((customer) => ({
      customer_id: customer.customer_id,
      devices: customer.devices,
      loyalty_points: customer.loyalty_points,
      opt_in: customer.opt_in,
      is_test: customer.is_test,
      name: piiFull ? customer.name : maskName(customer.name),
    }));
    return HttpResponse.json({
      total: audience.length,
      eligible: eligible.length,
      matched: recipients.length,
      matched_non_iot: matchedNonIot,
      sample,
      pii_masked: !piiFull,
    });
  }),

  http.post('/api/campaigns/test-send', async ({ request }) => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    const body = (await request.json().catch(() => null)) as {
      recipients?: unknown;
    } | null;
    const recipients = Array.isArray(body?.recipients)
      ? body.recipients.filter(
          (item): item is string => typeof item === 'string' && !!item.trim()
        )
      : [];
    if (recipients.length === 0) return error('validation', 422);
    await delay(400);
    recordAudit(actor(), {
      module: 'campaigns',
      action: 'test_send',
      target: recipients.join(', '),
    });
    return HttpResponse.json({ ok: true });
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
    const invalidPackage = packageInputError(
      input.promotedPackageId,
      input.offer
    );
    if (invalidPackage) return invalidPackage;
    const who = actor();
    const now = new Date().toISOString();
    const campaign: CampaignDto = {
      id: `CMP-${randomId().slice(0, 6).toUpperCase()}`,
      priority: input.priority,
      tenant_id: input.tenantId,
      name: input.name,
      kind: input.kind,
      display_type: input.displayType,
      notification_group: input.notificationGroup,
      title: input.title,
      content: input.content,
      buttons: input.buttons,
      schedule_type: input.scheduleType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: 'draft',
      trigger_preset: input.triggerPreset,
      trigger_config: input.triggerConfig,
      frequency_cap_per_customer: input.frequencyCapPerCustomer,
      audience: input.audience,
      dedupe: input.dedupe,
      suppression: input.suppression,
      audience_count: input.audienceCount,
      ab_test: input.abTest,
      offer: input.offer,
      promoted_package_id: input.promotedPackageId,
      promoted_package: null,
      test_recipients: input.testRecipients,
      created_by: who.id,
      created_by_name: who.fullName,
      created_at: now,
      updated_at: now,
      approver_id: null,
      approver_name: null,
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
    return HttpResponse.json(withPackage(campaign), { status: 201 });
  }),

  http.get('/api/campaigns/:id', ({ params }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const campaign = find(String(params.id));
    if (!campaign) return error('not_found', 404);
    return HttpResponse.json(withPackage(campaign));
  }),

  http.put('/api/campaigns/:id', async ({ params, request }) => {
    if (!allowed('campaign.write')) return error('forbidden', 403);
    const index = campaignStore.findIndex((item) => item.id === params.id);
    if (index === -1) return error('not_found', 404);
    const current = campaignStore[index]!;
    // Only a draft is editable; a rejected campaign is already back in draft.
    if (current.status !== 'draft') return error('not_editable', 409);
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
    if (offerChanged && !allowed('campaign.voucher.create'))
      return error('forbidden', 403);
    const invalidPackage = packageInputError(
      input.promotedPackageId,
      input.offer
    );
    if (invalidPackage) return invalidPackage;
    const updated: CampaignDto = {
      ...current,
      tenant_id: input.tenantId,
      priority: input.priority,
      name: input.name,
      kind: input.kind,
      display_type: input.displayType,
      notification_group: input.notificationGroup,
      title: input.title,
      content: input.content,
      buttons: input.buttons,
      schedule_type: input.scheduleType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      trigger_preset: input.triggerPreset,
      trigger_config: input.triggerConfig,
      frequency_cap_per_customer: input.frequencyCapPerCustomer,
      audience: input.audience,
      dedupe: input.dedupe,
      suppression: input.suppression,
      audience_count: input.audienceCount,
      ab_test: input.abTest,
      offer: input.offer,
      promoted_package_id: input.promotedPackageId,
      test_recipients: input.testRecipients,
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
    return HttpResponse.json(withPackage(updated));
  }),

  http.post('/api/campaigns/:id/transition', async ({ params, request }) => {
    const body = (await request.json().catch(() => null)) as {
      action?: CampaignTransition;
      reason?: string;
      approverId?: string;
    } | null;
    const action = CAMPAIGN_TRANSITIONS.find((item) => item === body?.action);
    if (!action) return error('validation', 422);
    if (!allowed(TRANSITION_CAPABILITY[action])) return error('forbidden', 403);

    const index = campaignStore.findIndex((item) => item.id === params.id);
    if (index === -1) return error('not_found', 404);
    const current = materialize(campaignStore[index]!);

    const to = nextStatus(action, current.status);
    if (!to) return error('invalid_transition', 409);

    // Every transition carries a reason for the immutable audit entry.
    const reason = body?.reason?.trim() || null;
    if (!reason) return error('reason_required', 422);

    const who = actor();
    // Creator ≠ approver: the person who created it cannot approve/reject it.
    if (
      (action === 'approve' || action === 'reject') &&
      who.id === current.created_by
    )
      return error('self_approve', 403);

    // Going live (or toward it) needs a package that can still be granted.
    if (
      (action === 'submit' ||
        action === 'approve' ||
        action === 'run' ||
        action === 'resume') &&
      !packageGrantable(current.promoted_package_id)
    )
      return error('package_unavailable', 409);

    // Validate a submit before touching the stored campaign.
    let approver: { id: string; name: string } | undefined;
    if (action === 'submit') {
      if (!isComplete(current)) return error('incomplete', 422);
      approver = listMembersWithCapability('campaign.approve').find(
        (member) => member.id === body?.approverId
      );
      if (!approver || approver.id === current.created_by)
        return error('invalid_approver', 422);
    }

    const before = { status: current.status };
    current.status = to;
    current.updated_at = new Date().toISOString();

    if (approver) {
      current.approver_id = approver.id;
      current.approver_name = approver.name;
      current.rejected_reason = null;
    }
    if (action === 'approve') {
      current.approved_by = who.id;
      current.approved_by_name = who.fullName;
      current.approved_at = current.updated_at;
    }
    if (action === 'reject') {
      current.rejected_reason = reason;
      current.approver_id = null;
      current.approver_name = null;
    }
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
    return HttpResponse.json(withPackage(current));
  }),

  http.get('/api/campaigns/:id/metrics', ({ params }) => {
    if (!allowed('campaign.read')) return error('forbidden', 403);
    const campaign = find(String(params.id));
    if (!campaign) return error('not_found', 404);
    return HttpResponse.json(metricsFor(campaign));
  }),
];
