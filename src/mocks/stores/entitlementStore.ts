import dayjs from 'dayjs';

import {
  computeEntitlementQuota,
  getEntitlementKind,
  type EntitlementKind,
} from '@/features/service-packages/utils/entitlementRules';
import {
  servicePackageDetailsSchema,
  type ServicePackageConfiguration,
} from '@/features/service-packages/schemas/servicePackageConfiguration';
import type { ServicePackageDto } from '@/features/service-packages/schemas/servicePackageSchemas';
import type {
  EntitlementDto,
  EntitlementEventDto,
  EntitlementEventType,
  EntitlementOpenReservationDto,
  EntitlementPackageSnapshotDto,
  EntitlementStatus,
  EntitlementSummaryDto,
} from '@/features/devices/schemas/entitlementSchemas';
import { deviceFixtures } from '@/mocks/fixtures/devices';
import { modelFixtures } from '@/mocks/fixtures/models';
import { randomId } from '@/shared/lib/id';

import { inventoryStore } from './inventoryStore';
import { packageStore } from './servicePackageStore';

// Shared in-memory mock backend for device service entitlements (spec §3,
// §5, §6, §11): a package snapshot attached to a device, its usage, and the
// handful of service tickets that hold a reservation against one.

export interface EntitlementRecord {
  id: string;
  device_id: string;
  model_code: string;
  package_snapshot: EntitlementPackageSnapshotDto;
  kind: EntitlementKind;
  quota: number | null;
  used: number;
  activated_at: string | null; // device activation date; null while in stock
  starts_override_at: string | null; // "Thêm gói" §7.2: term starts from add date
  revoked: boolean;
  source: {
    kind: 'auto_attach' | 'bulk_assign' | 'manual_add';
    reference: string;
    at: string;
  };
}

export interface ServiceTicketRecord {
  ticket_id: string;
  ticket_code: string;
  device_id: string;
  entitlement_id: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string | null;
}

// `const` arrays mutated via push/splice/index assignment, never reassigned,
// per the convention in servicePackageStore.ts / inventoryStore.ts.
export const entitlementRecords: EntitlementRecord[] = [];
export const entitlementEvents: EntitlementEventDto[] = [];
export const serviceTickets: ServiceTicketRecord[] = [];

// ---- Derived read model (toEntitlementDto / entitlementSummaries) --------

const OPEN_RESERVATION_STATUSES = [
  'pending',
  'assigned',
  'in_progress',
] as const;

function openReservationsFor(
  entitlementId: string
): EntitlementOpenReservationDto[] {
  return serviceTickets
    .filter(
      (ticket) =>
        ticket.entitlement_id === entitlementId &&
        (OPEN_RESERVATION_STATUSES as readonly string[]).includes(ticket.status)
    )
    .map((ticket) => ({
      ticket_id: ticket.ticket_id,
      ticket_code: ticket.ticket_code,
      // Safe: filtered to the open-reservation subset above.
      ticket_status:
        ticket.status as (typeof OPEN_RESERVATION_STATUSES)[number],
      scheduled_at: ticket.scheduled_at,
    }));
}

// §5.3 priority order: revoked > expired > exhausted > expiring > active >
// pending. `pending` only wins when nothing above applies and the term has
// not started (`starts_at === null`) — the §15.2 install-before-activation
// exception falls out naturally: an install entitlement already used shows
// `exhausted` even though the device has no `activated_at` yet.
function computeStatus(params: {
  revoked: boolean;
  startsAt: string | null;
  endsAt: string | null;
  quota: number | null;
  used: number;
  now: Date;
}): EntitlementStatus {
  const { revoked, startsAt, endsAt, quota, used, now } = params;
  if (revoked) return 'revoked';
  if (endsAt !== null && now.getTime() >= new Date(endsAt).getTime())
    return 'expired';
  if (quota !== null && used >= quota) return 'exhausted';
  if (startsAt === null) return 'pending';
  if (endsAt !== null && dayjs(endsAt).diff(now, 'day') <= 30)
    return 'expiring';
  return 'active';
}

// §5.2: next due = starts_at + (used + 1) × interval, only for `counted`
// kinds with an interval, never past `ends_at`, and never once exhausted.
function computeNextDueAt(params: {
  kind: EntitlementKind;
  startsAt: string | null;
  endsAt: string | null;
  intervalMonths: number | null;
  used: number;
  status: EntitlementStatus;
}): string | null {
  const { kind, startsAt, endsAt, intervalMonths, used, status } = params;
  if (kind !== 'counted' || intervalMonths === null || startsAt === null)
    return null;
  if (status === 'exhausted') return null;
  const due = dayjs(startsAt).add(intervalMonths * (used + 1), 'month');
  if (endsAt !== null && due.isAfter(dayjs(endsAt))) return null;
  return due.toISOString();
}

export function toEntitlementDto(
  record: EntitlementRecord,
  now: Date
): EntitlementDto {
  const startsAt = record.starts_override_at ?? record.activated_at;
  const endsAt =
    startsAt !== null && record.package_snapshot.term_months !== null
      ? dayjs(startsAt)
          .add(record.package_snapshot.term_months, 'month')
          .toISOString()
      : null;
  const openReservations = openReservationsFor(record.id);
  const status = computeStatus({
    revoked: record.revoked,
    startsAt,
    endsAt,
    quota: record.quota,
    used: record.used,
    now,
  });
  const nextDueAt = computeNextDueAt({
    kind: record.kind,
    startsAt,
    endsAt,
    intervalMonths: record.package_snapshot.interval_months,
    used: record.used,
    status,
  });

  return {
    id: record.id,
    device_id: record.device_id,
    package_snapshot: record.package_snapshot,
    kind: record.kind,
    quota: record.quota,
    used: record.used,
    reserved: openReservations.length,
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    next_due_at: nextDueAt,
    source: record.source,
    open_reservations: openReservations,
  };
}

// §11/§8.1-8.2: list-row summary, excluding revoked/expired entitlements.
export function entitlementSummaries(
  deviceId: string,
  now: Date
): EntitlementSummaryDto[] {
  return entitlementRecords
    .filter((record) => record.device_id === deviceId)
    .map((record) => toEntitlementDto(record, now))
    .filter((dto) => dto.status !== 'revoked' && dto.status !== 'expired')
    .map((dto) => ({
      id: dto.id,
      name: dto.package_snapshot.name,
      kind: dto.kind,
      status: dto.status,
      used: dto.used,
      quota: dto.quota,
      ends_at: dto.ends_at,
      term_months: dto.package_snapshot.term_months,
      source_reference: dto.source.reference,
    }));
}

// ---- Attach (auto-attach on sync / bulk-assign / manual add) --------------

function getIntervalMonths(
  configuration: ServicePackageConfiguration
): number | null {
  switch (configuration.type) {
    case 'BT-FIL':
    case 'BT-CLN':
    case 'CS-WQ':
      return configuration.interval;
    default:
      return null;
  }
}

function getDelivery(
  configuration: ServicePackageConfiguration
): 'self' | 'technician' | 'shipment' | null {
  switch (configuration.type) {
    case 'BT-FIL':
    case 'BT-COR':
      return configuration.delivery;
    default:
      return null;
  }
}

function isModelInScope(
  details: { model_scope: 'all' | 'selected'; eligible_model_ids: string[] },
  modelCode: string
): boolean {
  if (details.model_scope === 'all') return true;
  const model = modelFixtures.find((item) => item.code === modelCode);
  if (!model) return false;
  return details.eligible_model_ids.includes(model.model_id);
}

function appendEntitlementEvent(
  entitlementId: string,
  input: {
    type: EntitlementEventType;
    countsAgainstQuota: boolean;
    reference?: EntitlementEventDto['reference'];
    reason?: string | null;
    note?: string | null;
    actor?: EntitlementEventDto['actor'];
    occurredAt: string;
  }
): EntitlementEventDto {
  const event: EntitlementEventDto = {
    id: randomId(),
    entitlement_id: entitlementId,
    type: input.type,
    counts_against_quota: input.countsAgainstQuota,
    reference: input.reference ?? {},
    reason: input.reason ?? null,
    note: input.note ?? null,
    actor: input.actor ?? { kind: 'system', name: 'system' },
    occurred_at: input.occurredAt,
  };
  entitlementEvents.push(event);
  return event;
}

// §4.1/§4.2: snapshot the package (deep copy — no live reference back to
// `packageStore`), check the device's model is in scope, and reject a
// duplicate active (non-revoked) package on the same device unless
// `options.allowDuplicate` (§7.2 "Thêm gói" explicitly allows a second
// grant of the same package). Returns `null` on any rejection — a package
// missing its full configuration (§4.1 "cấu hình đầy đủ") or of a `bundle`
// group (not decomposed in this phase, §2 "không phải mục tiêu") is also
// rejected.
export function attachPackage(
  target: { deviceId: string; modelCode: string; activatedAt: string | null },
  pkg: ServicePackageDto,
  source: EntitlementRecord['source'],
  options?: { allowDuplicate?: boolean; startsAt?: string }
): EntitlementRecord | null {
  const details = servicePackageDetailsSchema.safeParse(pkg);
  if (!details.success) return null;

  const kind = getEntitlementKind(details.data.service_type_code);
  if (kind === null) return null;

  if (!isModelInScope(details.data, target.modelCode)) return null;

  const alreadyAttached = entitlementRecords.some(
    (record) =>
      record.device_id === target.deviceId &&
      !record.revoked &&
      record.package_snapshot.package_id === pkg.id
  );
  if (alreadyAttached && !options?.allowDuplicate) return null;

  const quotaMode = pkg.quota_mode ?? 'default';
  const customQuota = pkg.custom_quota ?? null;
  const quota = computeEntitlementQuota(
    details.data.configuration,
    pkg.term_months,
    quotaMode,
    customQuota
  );

  const snapshot = structuredClone({
    package_id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    group: pkg.group,
    service_type_code: details.data.service_type_code,
    delivery: getDelivery(details.data.configuration),
    term_months: pkg.term_months,
    interval_months: getIntervalMonths(details.data.configuration),
    purpose: details.data.purpose,
    included_items: details.data.included_items,
    excluded_items: details.data.excluded_items,
    eligibility_description: details.data.eligibility_description,
    model_scope: details.data.model_scope,
    eligible_model_ids: details.data.eligible_model_ids,
    pricing_mode: details.data.pricing_mode,
    pricing_description: details.data.pricing_description,
    additional_cost_description: details.data.additional_cost_description,
    configuration: details.data.configuration,
    quota_mode: quotaMode,
    custom_quota: customQuota,
    quota,
  } satisfies EntitlementPackageSnapshotDto);

  const record: EntitlementRecord = {
    id: randomId(),
    device_id: target.deviceId,
    model_code: target.modelCode,
    package_snapshot: snapshot,
    kind,
    quota,
    used: 0,
    activated_at: target.activatedAt,
    starts_override_at: options?.startsAt ?? null,
    revoked: false,
    source,
  };
  entitlementRecords.push(record);
  appendEntitlementEvent(record.id, {
    type: 'attached',
    countsAgainstQuota: false,
    actor:
      source.kind === 'manual_add'
        ? { kind: 'staff', name: 'seed@mock.cms-portal.local' }
        : { kind: 'system', name: 'system' },
    occurredAt: source.at,
  });
  return record;
}

// ---- Seed data (deterministic — spec §12) ---------------------------------
// Computed relative to module-load time so the scenarios (active/expiring/
// exhausted/expired) stay correct for the lifetime of a dev/mock session,
// without hard-coding calendar dates. No randomness is used.

function findDeviceFixture(deviceId: string) {
  return deviceFixtures.find((item) => item.device_id === deviceId);
}

function findPackageFixture(packageId: string): ServicePackageDto | undefined {
  return packageStore.find((item) => item.id === packageId);
}

const seedNow = dayjs();

// 1) KGR-0001 — active, counted (BT-CLN), with a manual-usage + reversal
// pair in its history (net used back to 0).
{
  const device = findDeviceFixture('KGR-0001');
  const pkg = findPackageFixture('pkg-demo-clean');
  if (device && pkg) {
    const startsAt = seedNow.subtract(3, 'month').toISOString();
    const record = attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: startsAt,
      },
      { startsAt }
    );
    if (record) {
      const consumeEvent = appendEntitlementEvent(record.id, {
        type: 'manual',
        countsAgainstQuota: true,
        reason: 'callCenter',
        note: 'Ghi nhận qua tổng đài theo yêu cầu khách.',
        occurredAt: seedNow.subtract(1, 'month').toISOString(),
      });
      record.used += 1;
      appendEntitlementEvent(record.id, {
        type: 'reversal',
        countsAgainstQuota: false,
        reference: { reversed_event_id: consumeEvent.id },
        reason: 'Ghi nhận nhầm, hoàn lại lượt cho khách.',
        occurredAt: seedNow.subtract(20, 'day').toISOString(),
      });
      record.used -= 1;
    }
  }
}

// 2) KGR-0002 — expiring (time_only, BH-EXT), ends in ~20 days.
{
  const device = findDeviceFixture('KGR-0002');
  const pkg = findPackageFixture('pkg-demo-autoattach-warranty');
  if (device && pkg) {
    const startsAt = seedNow.subtract(12, 'month').add(20, 'day').toISOString();
    attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: startsAt,
      },
      { startsAt }
    );
  }
}

// 3) KGR-0003 — exhausted (counted, BT-CLN), two manual visits used up.
{
  const device = findDeviceFixture('KGR-0003');
  const pkg = findPackageFixture('pkg-demo-clean');
  if (device && pkg) {
    const startsAt = seedNow.subtract(2, 'month').toISOString();
    const record = attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: startsAt,
      },
      { startsAt }
    );
    if (record) {
      appendEntitlementEvent(record.id, {
        type: 'manual',
        countsAgainstQuota: true,
        reason: 'centerService',
        note: 'Vệ sinh máy lượt 1.',
        occurredAt: seedNow.subtract(6, 'week').toISOString(),
      });
      appendEntitlementEvent(record.id, {
        type: 'manual',
        countsAgainstQuota: true,
        reason: 'centerService',
        note: 'Vệ sinh máy lượt 2.',
        occurredAt: seedNow.subtract(2, 'week').toISOString(),
      });
      record.used = 2;
    }
  }
}

// 4) KGR-0004 — Task 8 fixture device: already has a core-life alert
// (see GET /devices/:id/core-alerts — model KGR-A100 position hashes land
// above the warning threshold for this id) *and* an active BT-FIL
// technician-delivery entitlement with its full quota remaining, so the
// "create service ticket from core alert → use a package" flow has
// something to offer.
{
  const device = findDeviceFixture('KGR-0004');
  const pkg = findPackageFixture('pkg-demo-autoattach-filter-tech');
  if (device && pkg) {
    const startsAt = seedNow.subtract(2, 'month').toISOString();
    attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'manual_add',
        reference: 'Gán minh họa cho kịch bản cảnh báo lõi (Task 8)',
        at: startsAt,
      },
      { startsAt }
    );
  }
}

// 5) KGR-0005 — expired (time_only, BH-EXT), ended ~2 months ago.
{
  const device = findDeviceFixture('KGR-0005');
  const pkg = findPackageFixture('pkg-demo-autoattach-warranty');
  if (device && pkg) {
    const startsAt = seedNow.subtract(14, 'month').toISOString();
    attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: startsAt,
      },
      { startsAt }
    );
  }
}

// 6) KGR-0007 — active (counted, BT-FIL self-delivery): one core shipment
// logged (used 1/2), one customer QR scan (does not count against quota),
// and one `assigned` service ticket holding a reservation.
{
  const device = findDeviceFixture('KGR-0007');
  const pkg = findPackageFixture('pkg-demo-autoattach-filter-self');
  if (device && pkg) {
    const startsAt = seedNow.subtract(1, 'month').toISOString();
    const record = attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: startsAt,
      },
      { startsAt }
    );
    if (record) {
      appendEntitlementEvent(record.id, {
        type: 'shipment',
        countsAgainstQuota: true,
        reference: { tracking_code: 'GHN-SEED-0007' },
        note: 'Đã gửi lõi thay thế cho khách.',
        occurredAt: seedNow.subtract(2, 'week').toISOString(),
      });
      record.used = 1;
      appendEntitlementEvent(record.id, {
        type: 'customer_qr_scan',
        countsAgainstQuota: false,
        reference: { core_qr_code: 'QR-CORE-SEED-0007' },
        note: 'Khách tự quét QR lõi — chỉ reset đồng hồ, không trừ lượt.',
        occurredAt: seedNow.subtract(3, 'day').toISOString(),
      });
      serviceTickets.push({
        ticket_id: randomId(),
        ticket_code: 'SR-SEED-0007',
        device_id: device.device_id,
        entitlement_id: record.id,
        status: 'assigned',
        scheduled_at: seedNow.add(3, 'day').toISOString(),
      });
    }
  }
}

// 7) A non-IoT device with an entitlement (§12). Non-IoT product lines are
// behind the `nonIotProductsEnabled` flag (src/mocks/fixtures/nonIotProducts
// .ts) — currently off, so no non-IoT device exists to seed; this block
// activates automatically once that flag (and its fixtures) turn on, with
// no change needed here.
{
  const device = deviceFixtures.find((item) => item.connectivity === 'non_iot');
  const pkg = findPackageFixture('pkg-demo-install');
  if (device && pkg) {
    const startsAt = device.activated_at ?? seedNow.toISOString();
    attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: startsAt,
      },
      { startsAt }
    );
  }
}

// 8) A few in-stock devices with `pending` entitlements (no activation, no
// starts override — status is derived as `pending` until the device
// activates).
const PENDING_INVENTORY_SEEDS: ReadonlyArray<{
  deviceId: string;
  packageId: string;
}> = [
  { deviceId: 'KGR-1001', packageId: 'pkg-demo-autoattach-filter-self' },
  { deviceId: 'KGR-1002', packageId: 'pkg-demo-autoattach-filter-tech' },
  { deviceId: 'KGR-1004', packageId: 'pkg-demo-clean' },
];
for (const seed of PENDING_INVENTORY_SEEDS) {
  const device = inventoryStore.find(
    (item) => item.device_id === seed.deviceId
  );
  const pkg = findPackageFixture(seed.packageId);
  if (device && pkg) {
    attachPackage(
      {
        deviceId: device.device_id,
        modelCode: device.model_name,
        activatedAt: null,
      },
      pkg,
      {
        kind: 'auto_attach',
        reference: 'Đồng bộ kho (dữ liệu minh họa)',
        at: device.received_at,
      }
    );
  }
}
