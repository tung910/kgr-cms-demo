import { HttpResponse, delay, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { recordAudit } from '@/features/system/mocks/systemHandlers';
import { campaignAudienceFixtures } from '@/mocks/fixtures/campaignAudience';
import { campaignFixtures } from '@/mocks/fixtures/campaigns';
import { randomId } from '@/shared/lib/id';
import { maskName } from '@/shared/lib/mask';

import type {
  AudienceConditions,
  AudienceCustomerDto,
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
  return campaign;
}

function materializeAll(): CampaignDto[] {
  return campaignStore.map(materialize);
}

// ---- audience segmentation (spec 7.2) --------------------------------------

function inRange(value: number, range?: NumberRange): boolean {
  if (!range) return true;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

function matchesConditions(
  customer: AudienceCustomerDto,
  c: AudienceConditions
): boolean {
  if (c.regions.length && !c.regions.includes(customer.region)) return false;
  if (c.models.length && !c.models.includes(customer.model_name)) return false;
  if (
    c.firmwareVersions.length &&
    !c.firmwareVersions.includes(customer.firmware_version)
  ) {
    return false;
  }
  if (
    c.warrantyStatuses.length &&
    !c.warrantyStatuses.includes(customer.warranty_status)
  ) {
    return false;
  }
  return (
    inRange(customer.core_remaining_days, c.coreRemainingDays) &&
    inRange(customer.loyalty_points, c.loyaltyPoints) &&
    inRange(customer.region_tds, c.regionTds) &&
    inRange(customer.tenure_days, c.tenureDays)
  );
}

// Opted-out customers (spec 7.7.a) are hard-excluded from every audience —
// manual campaigns and triggers alike — before any condition is evaluated.
function isContactable(customer: AudienceCustomerDto): boolean {
  return customer.opt_in;
}

function countAudience(conditions: AudienceConditions): AudienceCustomerDto[] {
  return audience.filter(
    (customer) =>
      isContactable(customer) && matchesConditions(customer, conditions)
  );
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
  const seed = hashId(campaign.id);
  const base = campaign.audience_count ?? 30 + (seed % 70);
  const sent = base * (8 + (seed % 5)); // several sends per matched customer
  const delivered = Math.round(sent * (0.95 + (seed % 4) / 100));
  const opened = Math.round(delivered * (0.45 + (seed % 20) / 100));
  const clicked = Math.round(opened * (0.3 + (seed % 15) / 100));
  const conversionsBooking = Math.round(clicked * (0.18 + (seed % 8) / 100));
  const conversionsQr = Math.round(clicked * (0.12 + (seed % 6) / 100));
  const revenue = conversionsBooking * 450_000 + conversionsQr * 320_000;
  return {
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
  const campaign = campaignStore.find((item) => item.id === id);
  return campaign ? materialize(campaign) : undefined;
}

// ---- transitions (spec 7.5) ------------------------------------------------

type TransitionAction = 'submit' | 'approve' | 'reject' | 'run' | 'stop';

// Spec 7.5 separates "duyệt" (approve/reject) from "cho chạy/dừng" (run/stop):
// run and stop are gated by campaign.send, not campaign.approve.
const TRANSITION_CAPABILITY: Record<TransitionAction, Capability> = {
  submit: 'campaign.write',
  approve: 'campaign.approve',
  reject: 'campaign.approve',
  run: 'campaign.send',
  stop: 'campaign.send',
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
    case 'stop':
      return from === 'running' ? 'ended' : null;
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
    const who = actor();
    const now = new Date().toISOString();
    const campaign: CampaignDto = {
      id: `CMP-${randomId().slice(0, 6).toUpperCase()}`,
      name: input.name,
      kind: input.kind,
      channel: input.channel,
      content_vi: input.contentVi,
      content_en: input.contentEn,
      image_url: input.imageUrl,
      deeplink: input.deeplink,
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
      after: { name: campaign.name, status: campaign.status },
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
    // PII mask (NĐ 13, spec 7.7.b): roles without device.pii.full see customer
    // names masked in the preview sample — the same gate the device/owner
    // screens use, so API, UI and any export stay consistent.
    const piiFull = allowed('device.pii.full');
    const sample = matched
      .slice(0, 5)
      .map((customer) =>
        piiFull ? customer : { ...customer, name: maskName(customer.name) }
      );
    return HttpResponse.json({
      total: audience.length,
      matched: matched.length,
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
    // Only an editable (not-yet-approved) campaign may be changed.
    if (current.status !== 'draft' && current.status !== 'rejected') {
      return error('not_editable', 409);
    }
    const parsed = campaignDraftInputSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) return error('validation', 422);
    const input = parsed.data;
    const updated: CampaignDto = {
      ...current,
      name: input.name,
      kind: input.kind,
      channel: input.channel,
      content_vi: input.contentVi,
      content_en: input.contentEn,
      image_url: input.imageUrl,
      deeplink: input.deeplink,
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
      after: { name: updated.name },
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
    if (
      (action === 'approve' || action === 'reject' || action === 'stop') &&
      !reason
    ) {
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
      current.approved_by = who.id;
      current.approved_by_name = who.fullName;
      current.approved_at = current.updated_at;
      current.rejected_reason = null;
    }
    if (action === 'reject') current.rejected_reason = reason;
    if (action === 'run' && current.schedule_type === 'send_now') {
      current.starts_at = current.starts_at ?? current.updated_at;
    }
    if (action === 'stop') current.ends_at = current.updated_at;
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
