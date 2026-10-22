import { HttpResponse, http } from 'msw';
import { z } from 'zod';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import i18n from '@/core/i18n';
import { customerMockData } from '@/features/customers/mocks/customerMockData';
import { randomId } from '@/shared/lib/id';
import { maskEmail, maskInstallAddress, maskPhone } from '@/shared/lib/mask';
import {
  deviceMutationSchema,
  deviceLifecycleMutationSchema,
} from '@/features/devices/schemas/deviceSchemas';

import { isPortalRole, type PortalRole } from '@/core/auth/types';
import { systemHandlers } from '@/features/system/mocks/systemHandlers';
import { deviceExtraHandlers } from '@/features/devices/mocks/deviceExtraHandlers';
import { campaignHandlers } from '@/features/campaigns/mocks/campaignHandlers';
import type { DeviceDto } from '@/features/devices/schemas/deviceSchemas';
import type { ConnectionStatus } from '@/shared/constants/connectionStatus';

import {
  coreLifecycleConfigDtoSchema,
  type CoreLifecycleConfigDto,
} from '@/features/serials/schemas/coreLifecycleSchemas';
import type {
  SerialBatchDto,
  SerialDto,
} from '@/features/serials/schemas/serialSchemas';

import { deviceFixtures } from './fixtures/devices';
import {
  buildDashboardActiveFixture,
  dashboardSummaryFixture,
} from './fixtures/dashboard';
import { modelFixtures } from './fixtures/models';
import { serialBatchFixtures, serialFixtures } from './fixtures/serials';
import { coreLifecycleConfigFixture } from './fixtures/coreLifecycleConfigs';
import {
  buildAlertHistory,
  buildConnectivityHistory,
  buildFilterChangeHistory,
  buildOtaHistory,
  buildServiceHistory,
} from './fixtures/deviceDetailFixtures';
import type {
  DeviceCommandKind,
  DeviceCommandLogEntryDto,
  OwnerCandidateDto,
  OwnerMutationResultDto,
  DeviceOwnerProfileDto,
  FilterCoreStatusDto,
  TelemetryPointDto,
} from '@/features/devices/schemas/deviceDetailSchemas';

// Mutable in-memory stores so PUT handlers can persist edits for the
// lifetime of the browser session (mock backend, resets on reload).
const deviceStore: DeviceDto[] = deviceFixtures.map((device) => ({
  ...device,
}));
let coreLifecycleStore: CoreLifecycleConfigDto = coreLifecycleConfigFixture;
const serialStore: SerialDto[] = serialFixtures.map((serial) => ({
  ...serial,
}));
const serialBatchStore: SerialBatchDto[] = serialBatchFixtures.map((batch) => ({
  ...batch,
}));

const mockRoleStorageKey = 'cms-portal:mock-auth-role';
// Tombstones retain audit/technical history and reserve deleted serials in this mock session.
const deletedDeviceStore = new Map<string, DeviceDto>();
// M03.1: which core positions already have a service ticket ("đã phân công").
const assignedCorePositions = new Map<string, Set<string>>();
interface DiagnosticsJobRecord {
  id: string;
  device_id: string;
  requested_at: string;
  completed_at?: string;
  status: 'pending' | 'ready' | 'failed';
  metrics?: Array<{ label: string; value: string }>;
  recent_error_codes?: string[];
}
const diagnosticsJobStore: DiagnosticsJobRecord[] = [];
// Remote command audit trail — append-only, never edited from the UI.
const commandLogStore: Array<{
  device_id: string;
  entry: DeviceCommandLogEntryDto;
}> = [];
const ownerChangeRequestSchema = z.object({
  customer_id: z.string().min(1),
  reason: z.string().trim().min(1),
});
const reasonRequestSchema = z.object({
  reason: z.string().trim().min(1),
});

// ponytail: fake usage hash; the platform computes the real % from months
// vs TDS-weighted liters.
function mockCoreUsedPercent(deviceId: string, position: string): number {
  return (
    30 +
    (Math.abs(
      [...`${deviceId}-${position}`].reduce(
        (hash, char) => hash * 31 + char.charCodeAt(0),
        0
      )
    ) %
      70)
  );
}

// ponytail: the M04.1 config has no per-core function text or health
// thresholds yet; these stand in until it does (spec example: 30% / 10%).
const CORE_FUNCTIONS: Record<string, string> = {
  'CORE-PP': 'Lọc cặn thô, rỉ sét',
  'CORE-PP-ALUM': 'Xử lý phèn, cặn mịn',
  'CORE-CARBON': 'Khử clo, mùi và màu',
  'CORE-RO': 'Loại bỏ ion kim loại, vi khuẩn',
  'CORE-POST': 'Cân bằng vị nước',
  'CORE-MINERAL': 'Bổ sung khoáng chất',
  'CORE-HYDROGEN': 'Tạo nước giàu hydrogen',
};
const CORE_POOR_PERCENT = 30;
const CORE_CRITICAL_PERCENT = 10;

// Deterministic telemetry wave so a refetch draws the same chart.
function buildTelemetryHistory(
  deviceId: string,
  range: string
): TelemetryPointDto[] {
  const [count, stepMs] =
    range === '30d'
      ? [30, 86_400_000]
      : range === '7d'
        ? [42, 4 * 3_600_000]
        : [48, 1_800_000];
  const seed = [...deviceId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const phase = seed + i;
    return {
      measured_at: new Date(now - (count - 1 - i) * stepMs).toISOString(),
      tds_in_ppm: Math.round(260 + 90 * Math.sin(phase / 4) + (phase % 7) * 5),
      tds_out_ppm: Math.round(34 + 5 * Math.sin(phase / 2.5) + (phase % 3)),
    };
  });
}
// ponytail: the spec's <30s figure is a real device round-trip; the mock
// resolves near-instantly (2s) so manual QA doesn't sit there waiting.
const DIAGNOSTICS_READY_AFTER_MS = 2000;
const commandBlockingConditions = (device: DeviceDto): string[] => {
  const reasons: string[] = [];
  if (device.lifecycle_state !== 'active')
    reasons.push(i18n.t('devices:controlPanel.blocking.notActive'));
  if (device.has_active_ota)
    reasons.push(i18n.t('devices:controlPanel.blocking.activeOta'));
  return reasons;
};
const powerOffBlockingConditions = (device: DeviceDto): string[] => {
  const reasons = commandBlockingConditions(device);
  if (device.has_active_rental_contract)
    reasons.push(i18n.t('devices:controlPanel.blocking.activeRental'));
  return reasons;
};

// Mutates the stored job to "ready" once the mock delay has elapsed, then
// returns it — polling GET calls this so the transition needs no timer.
function resolveDiagnosticsJob(
  job: DiagnosticsJobRecord
): DiagnosticsJobRecord {
  if (job.status !== 'pending') return job;
  const elapsed = Date.now() - new Date(job.requested_at).getTime();
  if (elapsed < DIAGNOSTICS_READY_AFTER_MS) return job;
  job.status = 'ready';
  job.completed_at = new Date().toISOString();
  job.metrics = [
    { label: 'Nhiệt độ bầu nóng', value: '88°C' },
    { label: 'Áp suất đầu vào', value: '2.1 bar' },
    { label: 'Trạng thái bơm', value: 'Bình thường' },
  ];
  job.recent_error_codes = [];
  return job;
}
function deviceError(key: string, status = 409) {
  return HttpResponse.json(
    { message: i18n.t('devices:errors.' + key) },
    { status }
  );
}
// Core positions come from the M04.1 config, the single source of truth for
// how many cores a model has and what each one is called.
function corePositionsForModelName(
  modelName: string | undefined
): Array<{ position: string; core_name: string; default_sku: string }> {
  const model = modelFixtures.find((item) => item.code === modelName);
  const layout = coreLifecycleStore.model_layouts.find(
    (item) => item.model_id === model?.model_id
  );
  return (layout?.positions ?? []).map((item) => ({
    position: item.position,
    core_name: item.name,
    default_sku: item.default_sku,
  }));
}

function serialError(key: string, status = 409) {
  return HttpResponse.json(
    { message: i18n.t('serials:errors.' + key) },
    { status }
  );
}

// M04 batch ingest: the factory file carries only (serial, key); the model is
// encoded in the serial string itself and must resolve to a known model.
function ingestSerialFile(content: string) {
  const rejected: Array<{ line: number; serial: string; reason: string }> = [];
  const accepted: Array<{ serial: string; key: string; modelCode: string }> =
    [];
  const seenInFile = new Set<string>();
  const knownModelCodes = new Set(modelFixtures.map((model) => model.code));
  const rows = content
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  rows.forEach((row, index) => {
    const line = index + 1;
    if (line === 1 && row.toLocaleLowerCase().startsWith('serial')) return;

    const [serial = '', key = ''] = row.split(',').map((cell) => cell.trim());
    if (!serial || !key) {
      rejected.push({ line, serial, reason: 'missingField' });
      return;
    }

    const modelCode = serial.split('-').slice(0, 2).join('-');
    if (!/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{4,}$/.test(serial)) {
      rejected.push({ line, serial, reason: 'invalidSerialFormat' });
      return;
    }
    if (!knownModelCodes.has(modelCode)) {
      rejected.push({ line, serial, reason: 'unknownModel' });
      return;
    }
    if (seenInFile.has(serial)) {
      rejected.push({ line, serial, reason: 'duplicateInFile' });
      return;
    }
    if (serialStore.some((item) => item.serial === serial)) {
      rejected.push({ line, serial, reason: 'alreadyIngested' });
      return;
    }

    seenInFile.add(serial);
    accepted.push({ serial, key, modelCode });
  });

  const ingestedAt = new Date().toISOString();
  const batchId = `LOT-${ingestedAt.slice(0, 10).replace(/-/g, '')}-${serialBatchStore.length + 1}`;

  if (accepted.length > 0) {
    serialStore.push(
      ...accepted.map((row) => ({
        serial: row.serial,
        masked_key: `${row.key.slice(0, 2)}••••••`,
        model_code: row.modelCode,
        batch_id: batchId,
        status: 'unused' as const,
        ingested_at: ingestedAt,
        used_at: null,
        used_by_device_id: null,
      }))
    );
    serialBatchStore.push({
      batch_id: batchId,
      model_code: accepted[0]!.modelCode,
      total: accepted.length,
      used: 0,
      ingested_at: ingestedAt,
      recalled_at: null,
      recall_reason: null,
    });
  }

  return { batch_id: batchId, inserted: accepted.length, rejected };
}

function allowed(capability: Capability) {
  const role = getMockRole();
  return Boolean(role && hasCapability(role, capability));
}

function getMockRole(): PortalRole | undefined {
  const role = localStorage.getItem(mockRoleStorageKey);
  return isPortalRole(role) ? role : undefined;
}

function getMockActor(): string {
  const role = getMockRole();
  return role
    ? `${role}@mock.cms-portal.local`
    : 'unknown@mock.cms-portal.local';
}

// List rows carry only the lowest-remaining core, derived from the same
// deterministic usage as /filter-cores so both views agree.
function withAttentionCore(device: DeviceDto): DeviceDto {
  const [attentionCore] = corePositionsForModelName(device.model_name)
    .map((core) => ({
      position: core.position,
      core_name: core.core_name,
      remaining_percent:
        100 - mockCoreUsedPercent(device.device_id, core.position),
    }))
    .sort((a, b) => a.remaining_percent - b.remaining_percent);
  return attentionCore ? { ...device, attention_core: attentionCore } : device;
}

// Audit entries whose before/after values carry owner or member PII.
const OWNER_AUDIT_ACTIONS = new Set([
  'change_owner',
  'remove_owner',
  'revoke_sharing',
  'delete',
  'restore',
]);

// §2.3/§3.4: masking happens here, at the response layer, so the API and any
// export built from it always agree with what the UI shows. `owner` keeps its
// id because the §3.2 list shows the customer ID to every role.
function deviceForRole(
  device: DeviceDto,
  role: PortalRole | undefined
): DeviceDto {
  // §3.4c: the lock state is only visible with device.control.read, so other
  // roles see a locked device as `active` in the API and in exports.
  const visible: DeviceDto =
    device.lifecycle_state === 'locked' &&
    !(role && hasCapability(role, 'device.control.read'))
      ? { ...device, lifecycle_state: 'active' }
      : device;
  if (role && hasCapability(role, 'device.pii.full')) return visible;
  return {
    ...visible,
    install_address: maskInstallAddress(device.install_address),
    ...(device.owner && { owner: { id: device.owner.id } }),
    shared_members: undefined,
    owner_history: undefined,
    operation_log: device.operation_log.map((entry) =>
      OWNER_AUDIT_ACTIONS.has(entry.action)
        ? { ...entry, before_value: undefined, after_value: undefined }
        : entry
    ),
  };
}

function appendOperationLog(
  device: DeviceDto,
  action: string,
  reason: string,
  beforeValue?: string,
  afterValue?: string
): DeviceDto {
  const entry: {
    id: string;
    actor: string;
    action: string;
    reason: string;
    occurred_at: string;
    before_value?: string;
    after_value?: string;
  } = {
    id: randomId(),
    actor: getMockActor(),
    action,
    reason,
    occurred_at: new Date().toISOString(),
    ...(beforeValue !== undefined && { before_value: beforeValue }),
    ...(afterValue !== undefined && { after_value: afterValue }),
  };

  return {
    ...device,
    operation_log: [entry, ...device.operation_log],
  };
}

// Ends the open ownership period so the history keeps who owned the device when.
function closeOwnerHistory(
  device: DeviceDto,
  endedAt: string,
  reason: string
): NonNullable<DeviceDto['owner_history']> {
  return (device.owner_history ?? []).map((entry) =>
    entry.ended_at ? entry : { ...entry, ended_at: endedAt, reason }
  );
}

async function readReason(request: Request): Promise<string | undefined> {
  const parsed = reasonRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  return parsed.success ? parsed.data.reason : undefined;
}

function findDeviceIndex(deviceId: string | undefined): number {
  return deviceStore.findIndex((item) => item.device_id === deviceId);
}

function blockingConditionMessage(device: DeviceDto): string | undefined {
  if (
    device.open_ticket_count +
      device.open_appointment_count +
      device.open_alert_count >
    0
  )
    return i18n.t('devices:deleteDialog.blocking.openTickets');
  if (device.has_active_ota)
    return i18n.t('devices:deleteDialog.blocking.activeOta');
  if (device.has_active_rental_contract)
    return i18n.t('devices:deleteDialog.blocking.activeRental');
  return undefined;
}

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type RestoreState =
  { restorable: true } | { restorable: false; reason: string };

// M03.1: QTHT can restore a device decommissioned within the last 7 days.
function findRestoreState(device: DeviceDto, now: Date): RestoreState {
  if (device.lifecycle_state === 'decommissioned') {
    const entry = device.operation_log.find(
      (item) => item.action === 'set_lifecycle_state'
    );
    const at = entry ? new Date(entry.occurred_at) : undefined;
    if (!at || now.getTime() - at.getTime() > RESTORE_WINDOW_MS)
      return {
        restorable: false,
        reason: i18n.t('devices:errors.restoreExpired'),
      };
    return { restorable: true };
  }
  return {
    restorable: false,
    reason: i18n.t('devices:errors.restoreNotEligible'),
  };
}

function hasServerError(url: URL): boolean {
  return url.searchParams.get('mock_error') === '500';
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isConnectionStatus(value: string | null): value is ConnectionStatus {
  return value === 'online' || value === 'offline' || value === 'warning';
}

// `warning` is not a connection state: it selects online devices that report
// an error, so the list and the status counts share one definition.
function matchesStatus(device: DeviceDto, status: ConnectionStatus): boolean {
  if (status === 'warning')
    return device.status === 'online' && device.has_error;
  return device.status === status;
}

function matchesSearch(device: DeviceDto, search: string): boolean {
  const needle = search.toLocaleLowerCase();
  const fields = [device.device_id, device.model_name, device.region];
  if (allowed('device.pii.full') && device.owner?.name)
    fields.push(device.owner.name);
  return fields.some((value) => value.toLocaleLowerCase().includes(needle));
}

function matchesCoreLifeRange(
  remainingPercent: number,
  range: string
): boolean {
  if (range === '10_20')
    return remainingPercent >= 10 && remainingPercent <= 20;
  if (range === '21_30') return remainingPercent > 20 && remainingPercent <= 30;
  if (range.startsWith('custom:')) {
    const parts = range.split(':');
    if (parts.length === 3) {
      const min = Number(parts[1]);
      const max = Number(parts[2]);
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        return remainingPercent >= min && remainingPercent <= max;
      }
    }
  }
  return true;
}

function matchesOfflineDuration(device: DeviceDto, range: string): boolean {
  if (device.status !== 'offline' || !device.last_online_at) return false;
  const diffMs = Date.now() - new Date(device.last_online_at).getTime();
  const minutes = diffMs / 60_000;
  if (range === 'under_30m') return minutes < 30;
  if (range === '30m_2h') return minutes >= 30 && minutes <= 120;
  if (range === '2h_24h') return minutes > 120 && minutes <= 1440;
  if (range === 'above_24h') return minutes > 1440;
  return true;
}

const ERROR_CATEGORY_MAP: Record<string, string> = {
  ER00051: 'hardware',
  ER00052: 'hardware',
  ER00053: 'sensor',
  ER00054: 'sensor',
  ER00058: 'filter',
  ER00062: 'connectivity',
  ER00066: 'other',
  ER00067: 'other',
  ER00068: 'firmware',
  ER00069: 'firmware',
  ER00070: 'sensor',
  ER00074: 'sensor',
};

function matchesErrorType(device: DeviceDto, errorType: string): boolean {
  // Non-IoT units report no device errors.
  if (device.connectivity === 'non_iot') return false;
  const alerts = buildAlertHistory(device.device_id).filter(
    (a) => a.status === 'open'
  );
  if (alerts.length > 0) {
    return alerts.some((a) => ERROR_CATEGORY_MAP[a.code] === errorType);
  }
  if (errorType === 'connectivity' && device.status === 'offline') return true;
  if (errorType === 'filter' && device.filter_life_percent <= 10) return true;
  if (errorType === 'hardware' && device.has_error) return true;
  return false;
}

function filterDevices(url: URL, withStatus: boolean): DeviceDto[] {
  const search = url.searchParams.get('search')?.trim() ?? '';
  const status = url.searchParams.get('status');
  const model = url.searchParams.get('model')?.trim();
  const region = url.searchParams.get('region')?.trim();
  const customerId = url.searchParams.get('customer_id')?.trim();
  const coreLife = url.searchParams.get('core_life')?.trim();
  const offlineDuration = url.searchParams.get('offline_duration')?.trim();
  const errorType = url.searchParams.get('error_type')?.trim();
  const moduleFirmware = url.searchParams.get('module_firmware')?.trim();
  const activatedFrom = url.searchParams.get('activated_from')?.trim();
  const activatedTo = url.searchParams.get('activated_to')?.trim();

  return deviceStore.filter((device) => {
    if (search && !matchesSearch(device, search)) return false;
    if (
      withStatus &&
      isConnectionStatus(status) &&
      !matchesStatus(device, status)
    )
      return false;
    if (model && device.model_name !== model) return false;
    if (region && device.region !== region) return false;
    if (customerId && device.owner?.id !== customerId) return false;
    if (coreLife) {
      // Non-IoT or never-connected units report no core life: never match.
      if (device.connectivity === 'non_iot' || device.last_online_at === null)
        return false;
      const cores = corePositionsForModelName(device.model_name).map((c) => ({
        remainingPercent:
          100 - mockCoreUsedPercent(device.device_id, c.position),
      }));
      const matches =
        cores.length > 0
          ? cores.some((c) =>
              matchesCoreLifeRange(c.remainingPercent, coreLife)
            )
          : matchesCoreLifeRange(device.filter_life_percent, coreLife);
      if (!matches) return false;
    }
    if (offlineDuration && !matchesOfflineDuration(device, offlineDuration))
      return false;
    if (errorType && !matchesErrorType(device, errorType)) return false;
    if (moduleFirmware && device.module_firmware_version !== moduleFirmware)
      return false;
    if (activatedFrom) {
      const act = device.activated_at?.slice(0, 10);
      if (!act || act < activatedFrom) return false;
    }
    if (activatedTo) {
      const act = device.activated_at?.slice(0, 10);
      if (!act || act > activatedTo) return false;
    }
    return true;
  });
}

async function mutateDevice(
  deviceId: string | readonly string[] | undefined,
  request: Request,
  action: string
) {
  // §3.4c: lock/unlock is a control command; restore/delete stay lifecycle.
  const preParseCapability: Capability =
    action === 'delete' || action === 'restore'
      ? 'device.lifecycle'
      : 'device.edit_info';
  if (action !== 'set_lifecycle_state' && !allowed(preParseCapability))
    return deviceError('forbidden', 403);
  const serverError = hasServerError(new URL(request.url));
  if (action !== 'set_lifecycle_state' && serverError)
    return deviceError('server', 500);
  const raw: unknown = await request.json().catch(() => null);
  const base = deviceMutationSchema.safeParse(raw);
  if (!base.success) return deviceError('invalidInput', 400);
  let lifecycleState: DeviceDto['lifecycle_state'] | undefined;
  if (action === 'set_lifecycle_state') {
    const parsed = deviceLifecycleMutationSchema.safeParse(raw);
    if (!parsed.success) return deviceError('invalidInput', 400);
    lifecycleState = parsed.data.lifecycle_state;
  }
  const capability: Capability =
    action === 'set_lifecycle_state'
      ? lifecycleState === 'decommissioned'
        ? 'device.lifecycle'
        : 'device.control'
      : preParseCapability;
  // Read after the final await so concurrent requests cannot overwrite audit entries.
  if (!allowed(capability)) return deviceError('forbidden', 403);
  if (action === 'set_lifecycle_state' && serverError)
    return deviceError('server', 500);
  const index = findDeviceIndex(
    typeof deviceId === 'string' ? deviceId : undefined
  );
  const current = deviceStore[index];
  if (!current) return deviceError('notFound', 404);
  const { reason } = base.data;
  const now = new Date().toISOString();
  let updated: DeviceDto = { ...current };
  if (action === 'delete') {
    const blocked = blockingConditionMessage(current);
    if (blocked)
      return HttpResponse.json({ message: blocked }, { status: 409 });
    if (
      current.activated_at ||
      current.last_online_at ||
      current.latest_telemetry.length > 0 ||
      current.status === 'online'
    )
      return deviceError('previouslyActive');
    updated = {
      ...current,
      owner: undefined,
      shared_members: [],
      automation_count: 0,
      app_sync_status: 'queued',
      owner_history: (current.owner_history ?? []).map((entry) =>
        !entry.ended_at ? { ...entry, ended_at: now, reason } : entry
      ),
    };
  } else if (action === 'set_lifecycle_state') {
    if (!lifecycleState) return deviceError('invalidInput', 400);
    if (current.lifecycle_state === 'decommissioned')
      return deviceError('inactive');
    updated = {
      ...current,
      lifecycle_state: lifecycleState,
      // Non-IoT units have no connection to drop.
      status: current.status === null ? null : 'offline',
      app_sync_status: 'queued',
    };
  } else if (action === 'restore') {
    const state = findRestoreState(current, new Date(now));
    if (!state.restorable)
      return HttpResponse.json({ message: state.reason }, { status: 409 });
    updated = {
      ...current,
      lifecycle_state: 'active',
      app_sync_status: 'queued',
    };
  }
  // Audit actual server values, never trust caller-supplied before/after values.
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of Object.keys(updated) as Array<keyof DeviceDto>) {
    if (
      key !== 'operation_log' &&
      JSON.stringify(current[key]) !== JSON.stringify(updated[key])
    ) {
      before[key] = current[key] ?? null;
      after[key] = updated[key] ?? null;
    }
  }
  if (action === 'delete') {
    before.deleted = false;
    after.deleted = true;
  }
  updated = appendOperationLog(
    updated,
    action,
    reason,
    JSON.stringify(before),
    JSON.stringify(after)
  );
  if (action === 'delete') {
    deletedDeviceStore.set(current.device_id, updated);
    deviceStore.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }
  deviceStore[index] = updated;
  return HttpResponse.json(deviceForRole(updated, getMockRole()));
}

export const handlers = [
  ...systemHandlers,
  ...campaignHandlers,
  ...deviceExtraHandlers,
  http.get('/api/dashboard/summary', ({ request }) => {
    if (hasServerError(new URL(request.url))) {
      return HttpResponse.json(
        { message: 'Mock dashboard server error.' },
        { status: 500 }
      );
    }
    return HttpResponse.json(dashboardSummaryFixture);
  }),
  http.get('/api/dashboard/active', ({ request }) => {
    if (!allowed('dashboard.active.read')) return deviceError('forbidden', 403);
    const url = new URL(request.url);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: 'Mock dashboard server error.' },
        { status: 500 }
      );
    }
    const granularity = url.searchParams.get('granularity');
    return HttpResponse.json(
      buildDashboardActiveFixture(
        granularity === 'week' || granularity === 'year' ? granularity : 'month'
      )
    );
  }),
  http.get('/api/devices/firmware-options', () => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    const moduleVersions = Array.from(
      new Set(
        deviceStore.flatMap((d) =>
          d.module_firmware_version ? [d.module_firmware_version] : []
        )
      )
    ).sort();
    const mainboardVersions = Array.from(
      new Set(
        deviceStore.flatMap((d) =>
          d.mainboard_firmware_version ? [d.mainboard_firmware_version] : []
        )
      )
    ).sort();
    return HttpResponse.json({
      module_versions: moduleVersions,
      mainboard_versions: mainboardVersions,
    });
  }),
  http.get('/api/devices', ({ request }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    if (
      new URL(request.url).searchParams.has('customer_id') &&
      !allowed('device.pii.full')
    )
      return deviceError('forbidden', 403);
    const url = new URL(request.url);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: i18n.t('devices:errors.server') },
        { status: 500 }
      );
    }

    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePositiveInteger(
      url.searchParams.get('page_size'),
      10
    );
    const filtered = filterDevices(url, true);
    const start = (page - 1) * pageSize;
    const role = getMockRole();

    return HttpResponse.json({
      items: filtered
        .slice(start, start + pageSize)
        .map((device) => deviceForRole(withAttentionCore(device), role)),
      page,
      page_size: pageSize,
      total: filtered.length,
    });
  }),
  http.get('/api/devices/status-counts', ({ request }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    const url = new URL(request.url);
    if (url.searchParams.has('customer_id') && !allowed('device.pii.full'))
      return deviceError('forbidden', 403);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: i18n.t('devices:errors.server') },
        { status: 500 }
      );
    }
    const devices = filterDevices(url, false);
    const count = (status: ConnectionStatus) =>
      devices.filter((device) => matchesStatus(device, status)).length;
    return HttpResponse.json({
      total: devices.length,
      non_iot: devices.filter((device) => device.connectivity === 'non_iot')
        .length,
      online: count('online'),
      warning: count('warning'),
      offline: count('offline'),
    });
  }),
  http.get('/api/devices/:deviceId', ({ params, request }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    const url = new URL(request.url);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: i18n.t('devices:errors.server') },
        { status: 500 }
      );
    }

    const device = deviceStore.find(
      (item) => item.device_id === params.deviceId
    );
    if (!device) {
      return HttpResponse.json(
        { message: i18n.t('devices:errors.notFound') },
        { status: 404 }
      );
    }

    return HttpResponse.json(deviceForRole(device, getMockRole()));
  }),
  http.post('/api/devices/:deviceId/lifecycle-state', ({ params, request }) =>
    mutateDevice(params.deviceId, request, 'set_lifecycle_state')
  ),
  http.post('/api/devices/:deviceId/delete', ({ params, request }) =>
    mutateDevice(params.deviceId, request, 'delete')
  ),
  http.post('/api/devices/:deviceId/restore', ({ params, request }) =>
    mutateDevice(params.deviceId, request, 'restore')
  ),
  // Device-scoped owner profile — §3.4 hides the owner block from roles without device.pii.full.
  http.get('/api/devices/:deviceId/owner', ({ params }) => {
    if (!allowed('device.pii.full')) return deviceError('forbidden', 403);
    const device = deviceStore.find(
      (item) => item.device_id === params.deviceId
    );
    if (!device) return deviceError('notFound', 404);
    const customer = customerMockData.find(
      (item) => item.id === device.owner?.id
    );
    if (!customer) return deviceError('customerNotFound', 404);
    const piiFull = allowed('device.pii.full');
    const profile: DeviceOwnerProfileDto = {
      id: customer.id,
      name: customer.name,
      phone: piiFull ? customer.phone : maskPhone(customer.phone),
      email: piiFull ? customer.email : maskEmail(customer.email),
      region: customer.region,
      joined_at: customer.joinedAt,
      pii_masked: !piiFull,
      devices: deviceStore
        .filter((item) => item.owner?.id === customer.id)
        .map((item) => ({
          device_id: item.device_id,
          display_name: item.display_name,
          model_name: item.model_name,
          status: item.status,
          has_error: item.has_error,
          warranty_status: item.warranty_status,
          warranty_expires_at: item.warranty_expires_at,
          last_online_at: item.last_online_at,
        })),
    };
    return HttpResponse.json(profile);
  }),
  http.get('/api/devices/:deviceId/owner-candidates', ({ request }) => {
    if (!allowed('device.owner.update')) return deviceError('forbidden', 403);
    const query =
      new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
    if (query.length < 2) return HttpResponse.json([]);
    const candidates: OwnerCandidateDto[] = customerMockData
      .filter(
        (customer) =>
          customer.phone.toLowerCase().includes(query) ||
          customer.id.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      }));
    return HttpResponse.json(candidates);
  }),
  http.put('/api/devices/:deviceId/owner', async ({ params, request }) => {
    if (!allowed('device.owner.update')) return deviceError('forbidden', 403);
    const parsed = ownerChangeRequestSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) return deviceError('invalidInput', 400);
    const { customer_id: customerId, reason } = parsed.data;
    const index = findDeviceIndex(String(params.deviceId));
    const current = deviceStore[index];
    if (!current) return deviceError('notFound', 404);
    const customer = customerMockData.find((item) => item.id === customerId);
    if (!customer) return deviceError('customerNotFound', 404);
    if (current.owner?.id === customer.id) return deviceError('sameOwner', 422);
    const now = new Date().toISOString();
    const owner = {
      id: customer.id,
      name: customer.name,
      phone_masked: customer.phone,
      address: customer.address,
    };
    deviceStore[index] = appendOperationLog(
      {
        ...current,
        owner,
        app_sync_status: 'queued',
        owner_history: [
          ...closeOwnerHistory(current, now, reason),
          { owner_id: customer.id, owner_name: customer.name, started_at: now },
        ],
      },
      'change_owner',
      reason,
      JSON.stringify({ owner: current.owner ?? null }),
      JSON.stringify({ owner })
    );
    const result: OwnerMutationResultDto = {
      previous_owner_notified: Boolean(current.owner),
    };
    return HttpResponse.json(result);
  }),
  http.post(
    '/api/devices/:deviceId/owner/remove',
    async ({ params, request }) => {
      if (!allowed('device.lifecycle')) return deviceError('forbidden', 403);
      const reason = await readReason(request);
      if (!reason) return deviceError('invalidInput', 400);
      const index = findDeviceIndex(String(params.deviceId));
      const current = deviceStore[index];
      if (!current) return deviceError('notFound', 404);
      if (!current.owner) return deviceError('noOwner', 409);
      deviceStore[index] = appendOperationLog(
        {
          ...current,
          owner: undefined,
          app_sync_status: 'queued',
          owner_history: closeOwnerHistory(
            current,
            new Date().toISOString(),
            reason
          ),
        },
        'remove_owner',
        reason,
        JSON.stringify({ owner: current.owner }),
        JSON.stringify({ owner: null })
      );
      const result: OwnerMutationResultDto = { previous_owner_notified: true };
      return HttpResponse.json(result);
    }
  ),
  http.post(
    '/api/devices/:deviceId/shared-members/:memberId/revoke',
    async ({ params, request }) => {
      if (!allowed('device.lifecycle')) return deviceError('forbidden', 403);
      const reason = await readReason(request);
      if (!reason) return deviceError('invalidInput', 400);
      const index = findDeviceIndex(String(params.deviceId));
      const current = deviceStore[index];
      if (!current) return deviceError('notFound', 404);
      const members = current.shared_members ?? [];
      const member = members.find((item) => item.id === params.memberId);
      if (!member) return deviceError('notFound', 404);
      deviceStore[index] = appendOperationLog(
        {
          ...current,
          shared_members: members.filter((item) => item.id !== member.id),
          app_sync_status: 'queued',
        },
        'revoke_sharing',
        reason,
        JSON.stringify({ shared_members: [member] }),
        JSON.stringify({ shared_members: [] })
      );
      return new HttpResponse(null, { status: 204 });
    }
  ),
  http.get('/api/devices/:deviceId/alerts', ({ params }) => {
    if (!allowed('device.history.read')) return deviceError('forbidden', 403);
    return HttpResponse.json(buildAlertHistory(String(params.deviceId)));
  }),
  http.get('/api/devices/:deviceId/filter-changes', ({ params }) => {
    if (!allowed('device.history.read')) return deviceError('forbidden', 403);
    const device = deviceStore.find(
      (item) => item.device_id === params.deviceId
    );
    return HttpResponse.json(
      buildFilterChangeHistory(
        String(params.deviceId),
        corePositionsForModelName(device?.model_name)
      )
    );
  }),
  http.get('/api/devices/:deviceId/ota-history', ({ params }) => {
    if (!allowed('device.history.read')) return deviceError('forbidden', 403);
    return HttpResponse.json(buildOtaHistory(String(params.deviceId)));
  }),
  http.get('/api/devices/:deviceId/connectivity-history', ({ params }) => {
    if (!allowed('device.history.read')) return deviceError('forbidden', 403);
    return HttpResponse.json(buildConnectivityHistory(String(params.deviceId)));
  }),
  http.get('/api/devices/:deviceId/service-history', ({ params }) => {
    if (!allowed('device.history.read')) return deviceError('forbidden', 403);
    return HttpResponse.json(buildServiceHistory(String(params.deviceId)));
  }),
  // M03.1 core-life alert block, derived from the M04.1 core config —
  // never hard-coded per model.
  http.get('/api/devices/:deviceId/core-alerts', ({ params }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    const deviceId = String(params.deviceId);
    const device = deviceStore.find((item) => item.device_id === deviceId);
    if (!device) return deviceError('notFound', 404);
    const assigned = assignedCorePositions.get(deviceId);

    const alerts = corePositionsForModelName(device.model_name).flatMap(
      (core) => {
        const positionNumber = Number(core.position);
        // ponytail: ER00056→ER00065 only covers positions 1–5; spec M04.1
        // "điểm cần chốt (5)" is open for models with more cores.
        if (
          !Number.isInteger(positionNumber) ||
          positionNumber < 1 ||
          positionNumber > 5
        )
          return [];
        const sku = coreLifecycleStore.cores.find(
          (item) => item.sku === core.default_sku
        );
        if (!sku) return [];
        const usedPercent = mockCoreUsedPercent(deviceId, core.position);
        if (usedPercent < sku.warning_level1_percent) return [];
        const level2 = usedPercent >= sku.warning_level2_percent;
        return [
          {
            position: core.position,
            core_name: core.core_name,
            used_percent: usedPercent,
            threshold_percent: level2
              ? sku.warning_level2_percent
              : sku.warning_level1_percent,
            error_code: `ER000${(level2 ? 60 : 55) + positionNumber}`,
            replacement_sku: sku.sku,
            status: assigned?.has(core.position) ? 'assigned' : 'open',
          },
        ];
      }
    );

    return HttpResponse.json(alerts);
  }),
  http.post(
    '/api/devices/:deviceId/service-tickets',
    async ({ params, request }) => {
      if (!allowed('device.read')) return deviceError('forbidden', 403);
      const deviceId = String(params.deviceId);
      const device = deviceStore.find((item) => item.device_id === deviceId);
      if (!device) return deviceError('notFound', 404);
      const body = (await request.json().catch(() => null)) as {
        reason?: string;
        core_position?: string;
      } | null;
      if (!body?.reason?.trim()) return deviceError('invalidInput', 400);
      if (body.core_position) {
        const positions =
          assignedCorePositions.get(deviceId) ?? new Set<string>();
        positions.add(body.core_position);
        assignedCorePositions.set(deviceId, positions);
      }
      return HttpResponse.json({
        ticket_id: `WT-${randomId().slice(0, 8)}`,
      });
    }
  ),
  http.get(
    '/api/devices/:deviceId/telemetry-history',
    ({ params, request }) => {
      if (!allowed('device.read')) return deviceError('forbidden', 403);
      const range = new URL(request.url).searchParams.get('range') ?? '24h';
      return HttpResponse.json(
        buildTelemetryHistory(String(params.deviceId), range)
      );
    }
  ),
  http.get('/api/devices/:deviceId/filter-cores', ({ params }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    const deviceId = String(params.deviceId);
    const device = deviceStore.find((item) => item.device_id === deviceId);
    if (!device) return deviceError('notFound', 404);
    const statuses = corePositionsForModelName(device.model_name).flatMap(
      (core): FilterCoreStatusDto[] => {
        const sku = coreLifecycleStore.cores.find(
          (item) => item.sku === core.default_sku
        );
        if (!sku) return [];
        const totalDays = sku.lifespan_months * 30;
        const used = mockCoreUsedPercent(deviceId, core.position);
        return [
          {
            position: core.position,
            core_name: core.core_name,
            core_type: sku.sku.replace(/^CORE-/, ''),
            ...(CORE_FUNCTIONS[sku.sku] && {
              function: CORE_FUNCTIONS[sku.sku],
            }),
            sku_name: sku.name,
            remaining_days: Math.max(
              0,
              Math.round((totalDays * (100 - used)) / 100)
            ),
            total_days: totalDays,
            warning_days: Math.round(
              (totalDays * (100 - sku.warning_level2_percent)) / 100
            ),
            poor_percent: CORE_POOR_PERCENT,
            critical_percent: CORE_CRITICAL_PERCENT,
          },
        ];
      }
    );
    return HttpResponse.json(statuses);
  }),
  http.get('/api/devices/:deviceId/commands', ({ params }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    return HttpResponse.json(
      commandLogStore
        .filter((entry) => entry.device_id === params.deviceId)
        .map((record) => record.entry)
        .reverse()
    );
  }),
  http.get('/api/devices/:deviceId/diagnostics', ({ params }) => {
    if (!allowed('device.diagnose')) return deviceError('forbidden', 403);
    const jobs = diagnosticsJobStore.filter(
      (job) => job.device_id === params.deviceId
    );
    return HttpResponse.json(
      jobs.map((job) => resolveDiagnosticsJob(job)).reverse()
    );
  }),
  http.post('/api/devices/:deviceId/diagnostics', ({ params }) => {
    if (!allowed('device.diagnose')) return deviceError('forbidden', 403);
    const deviceId = String(params.deviceId);
    const device = deviceStore.find((item) => item.device_id === deviceId);
    if (!device) return deviceError('notFound', 404);
    if (device.connectivity === 'non_iot') return deviceError('nonIot', 409);
    if (device.status === 'offline')
      return HttpResponse.json(
        { message: i18n.t('devices:diagnosticsPanel.offlineError') },
        { status: 409 }
      );
    const job: DiagnosticsJobRecord = {
      id: randomId(),
      device_id: deviceId,
      requested_at: new Date().toISOString(),
      status: 'pending',
    };
    diagnosticsJobStore.push(job);
    return HttpResponse.json(resolveDiagnosticsJob(job));
  }),
  http.get('/api/devices/:deviceId/diagnostics/:jobId', ({ params }) => {
    if (!allowed('device.diagnose')) return deviceError('forbidden', 403);
    const job = diagnosticsJobStore.find(
      (item) => item.id === params.jobId && item.device_id === params.deviceId
    );
    if (!job) return deviceError('notFound', 404);
    return HttpResponse.json(resolveDiagnosticsJob(job));
  }),
  http.post('/api/devices/:deviceId/commands', async ({ params, request }) => {
    if (!allowed('device.control')) return deviceError('forbidden', 403);
    const deviceId = String(params.deviceId);
    const index = findDeviceIndex(deviceId);
    const device = deviceStore[index];
    if (!device) return deviceError('notFound', 404);
    const body = (await request.json().catch(() => null)) as {
      command?: DeviceCommandKind;
      reason?: string;
    } | null;
    if (!body?.command || !body.reason?.trim())
      return deviceError('invalidInput', 400);
    if (device.connectivity === 'non_iot') return deviceError('nonIot', 409);

    const unmet =
      body.command === 'ping'
        ? []
        : body.command === 'power_off'
          ? powerOffBlockingConditions(device)
          : commandBlockingConditions(device);
    commandLogStore.push({
      device_id: deviceId,
      entry: {
        id: randomId(),
        command: body.command,
        actor: getMockActor(),
        reason: body.reason,
        requested_at: new Date().toISOString(),
        status:
          unmet.length > 0
            ? 'rejected'
            : device.status === 'offline'
              ? 'timeout'
              : 'ack',
      },
    });
    if (unmet.length > 0)
      return HttpResponse.json(
        {
          message: i18n.t('devices:controlPanel.blockedMessage', {
            conditions: unmet.join('; '),
          }),
        },
        { status: 422 }
      );

    // Power stays independent of `status`: an off device keeps its
    // connection so it can still receive a power-on command.
    const updated: DeviceDto =
      body.command === 'power_on'
        ? { ...device, powered: true }
        : body.command === 'power_off'
          ? { ...device, powered: false }
          : { ...device };
    deviceStore[index] = appendOperationLog(
      updated,
      'device_command',
      body.reason,
      undefined,
      body.command
    );
    return HttpResponse.json(deviceForRole(deviceStore[index]!, getMockRole()));
  }),
  http.get('/api/catalog/models', ({ request }) => {
    if (hasServerError(new URL(request.url))) {
      return HttpResponse.json(
        { message: 'Mock model reference server error.' },
        { status: 500 }
      );
    }

    return HttpResponse.json(modelFixtures);
  }),
  http.get('/api/serials', ({ request }) => {
    if (!allowed('serial.read')) return serialError('forbidden', 403);

    const url = new URL(request.url);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: 'Mock serial server error.' },
        { status: 500 }
      );
    }

    const search = url.searchParams.get('search')?.trim().toLocaleLowerCase();
    const modelCode = url.searchParams.get('model_code');
    const batchId = url.searchParams.get('batch_id');
    const status = url.searchParams.get('status');
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePositiveInteger(
      url.searchParams.get('page_size'),
      20
    );
    const filtered = serialStore.filter(
      (serial) =>
        (!search || serial.serial.toLocaleLowerCase().includes(search)) &&
        (!modelCode || serial.model_code === modelCode) &&
        (!batchId || serial.batch_id === batchId) &&
        (!status || serial.status === status)
    );
    const start = (page - 1) * pageSize;

    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: filtered.length,
    });
  }),
  http.get('/api/serials/batches', () => {
    if (!allowed('serial.read')) return serialError('forbidden', 403);
    return HttpResponse.json(serialBatchStore);
  }),
  http.post('/api/serials/batches', async ({ request }) => {
    if (!allowed('serial.write')) return serialError('forbidden', 403);

    const body = (await request.json()) as {
      file_name: string;
      content: string;
    };
    return HttpResponse.json(ingestSerialFile(body.content));
  }),
  http.post(
    '/api/serials/batches/:batchId/recall',
    async ({ params, request }) => {
      if (!allowed('serial.write')) return serialError('forbidden', 403);

      const index = serialBatchStore.findIndex(
        (batch) => batch.batch_id === params.batchId
      );
      if (index === -1) return serialError('batchNotFound', 404);
      if (serialBatchStore[index]!.recalled_at)
        return serialError('batchAlreadyRecalled', 409);

      const body = (await request.json()) as { reason?: string };
      const reason = body.reason?.trim();
      if (!reason) return serialError('recallReasonRequired', 400);

      const recalledAt = new Date().toISOString();
      serialBatchStore[index] = {
        ...serialBatchStore[index]!,
        recalled_at: recalledAt,
        recall_reason: reason,
      };
      for (const serial of serialStore) {
        if (serial.batch_id === params.batchId) serial.status = 'recalled';
      }

      return HttpResponse.json(serialBatchStore[index]);
    }
  ),
  http.get('/api/serials/core-config', ({ request }) => {
    if (!allowed('serial.read')) return serialError('forbidden', 403);
    if (hasServerError(new URL(request.url))) {
      return HttpResponse.json(
        { message: 'Mock core config server error.' },
        { status: 500 }
      );
    }
    return HttpResponse.json(coreLifecycleStore);
  }),
  http.put('/api/serials/core-config', async ({ request }) => {
    if (!allowed('core_config.write') && !allowed('core_config.tune')) {
      return serialError('forbidden', 403);
    }
    if (hasServerError(new URL(request.url))) {
      return HttpResponse.json(
        { message: 'Mock core config server error.' },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      cores?: unknown;
      model_layouts?: unknown;
      campaigns?: unknown;
      changes?: Array<{
        field: string;
        before_value: string;
        after_value: string;
      }>;
    } | null;
    const parsed = coreLifecycleConfigDtoSchema.safeParse({
      cores: body?.cores ?? coreLifecycleStore.cores,
      model_layouts: body?.model_layouts ?? coreLifecycleStore.model_layouts,
      campaigns: body?.campaigns ?? coreLifecycleStore.campaigns,
      audit_log: coreLifecycleStore.audit_log,
    });
    if (!parsed.success || !body?.changes?.length) {
      return serialError('invalidCoreConfig', 400);
    }
    const next = parsed.data;
    const current = coreLifecycleStore;

    // The SKU catalog is owned by product-line data: same SKUs, same names.
    const catalogKey = (cores: typeof next.cores) =>
      JSON.stringify(cores.map((core) => [core.sku, core.name]));
    if (catalogKey(next.cores) !== catalogKey(current.cores)) {
      return serialError('invalidCoreConfig', 400);
    }
    const skus = new Set(next.cores.map((core) => core.sku));
    const unknownSku = next.model_layouts.some((layout) =>
      layout.positions.some((item) =>
        item.compatible_skus.some((sku) => !skus.has(sku))
      )
    );
    if (unknownSku) return serialError('invalidCoreConfig', 400);

    // write = lifespan/kind/video/regions and model layout; tune = the rest.
    const writeFields = (cores: typeof next.cores) =>
      JSON.stringify(
        cores.map((core) => [
          core.kind,
          core.lifespan_months,
          core.lifespan_liters,
          core.guide_video_url,
          core.sale_regions,
        ])
      );
    const needsWrite =
      writeFields(next.cores) !== writeFields(current.cores) ||
      JSON.stringify(next.model_layouts) !==
        JSON.stringify(current.model_layouts);
    if (needsWrite && !allowed('core_config.write')) {
      return serialError('forbidden', 403);
    }
    if (!needsWrite && !allowed('core_config.tune')) {
      return serialError('forbidden', 403);
    }

    const now = Date.now();
    coreLifecycleStore = {
      ...next,
      audit_log: [
        ...body.changes.map((change, entryIndex) => ({
          id: `core-config-audit-${now}-${entryIndex}`,
          actor: getMockActor(),
          changed_at: new Date(now).toISOString(),
          field: change.field,
          before_value: change.before_value,
          after_value: change.after_value,
        })),
        ...current.audit_log,
      ],
    };
    return HttpResponse.json(coreLifecycleStore);
  }),
];
