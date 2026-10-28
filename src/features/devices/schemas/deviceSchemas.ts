import { z } from 'zod';

import type { ConnectionStatus } from '@/shared/constants/connectionStatus';
import type { ProductConnectivity } from '@/shared/constants/productConnectivity';

import { entitlementSummaryDtoSchema } from './entitlementSchemas';
import type { EntitlementSummary } from './entitlementSchemas';
import { productConnectivitySchema } from './productConnectivitySchema';

// Connection state only. A device that reports a fault is still `online`;
// the fault is the separate `hasError` flag.
export type DeviceStatus = 'online' | 'offline';
export type DeviceLifecycleState = 'active' | 'locked' | 'decommissioned';
export type DeviceWarrantyStatus = 'active' | 'expiring' | 'expired' | 'none';

/** Named tiers shown as fixed options, plus a user-defined band "custom:MIN:MAX" (e.g. "custom:0:9"). */
export type CoreLifeRange = '10_20' | '21_30' | `custom:${number}:${number}`;
export type OfflineDurationRange =
  'under_30m' | '30m_2h' | '2h_24h' | 'above_24h';
export type DeviceErrorType = 'connectivity' | 'waterLeak' | 'other';

export interface DeviceListFilters {
  search: string;
  // `warning` filters online devices that report an error (`hasError`).
  status?: ConnectionStatus;
  model?: string;
  region?: string;
  // No UI control: set by the customer list's device-count link.
  customerId?: string;
  coreLife?: CoreLifeRange;
  offlineDuration?: OfflineDurationRange;
  errorType?: DeviceErrorType;
  moduleFirmware?: string;
  activatedFrom?: string;
  activatedTo?: string;
  page: number;
  pageSize: number;
}

export interface FirmwareOptions {
  moduleVersions: string[];
  mainboardVersions: string[];
}

// Status cards ignore the status filter and pagination (§3.1).
export type DeviceCountFilters = Omit<
  DeviceListFilters,
  'status' | 'page' | 'pageSize'
>;

// online/warning/offline only count IoT devices; `total` also includes the
// non-IoT units, which never report a connection. `warning` is the subset of
// `online` devices with an error, so the three do not add up to `total`.
export interface DeviceStatusCounts {
  total: number;
  nonIot: number;
  online: number;
  warning: number;
  offline: number;
}

export interface DeviceOwner {
  id: string;
  // Omitted for roles without device.pii.full (§3.2 note).
  name?: string;
  // Masked server-side per the viewer's role (NĐ 13/2023) — never unmasked here.
  phoneMasked?: string;
  address?: string;
}

// ⚠️ Assumption: the app's share levels are "control" and "view"; confirm
// with OneKangaroo before the real API lands.
export const sharePermissionSchema = z.enum(['control', 'view']);

export type SharePermission = z.infer<typeof sharePermissionSchema>;

export interface DeviceTelemetry {
  metricKey: string;
  value: number;
  unit: string;
  measuredAt: string;
}

export interface DeviceSharedMember {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  permission: SharePermission;
  sharedAt: string;
}

export interface DeviceOwnerHistoryEntry {
  ownerId: string;
  ownerName: string;
  startedAt: string;
  endedAt?: string;
  reason?: string;
}

export interface DeviceOperationLogEntry {
  id: string;
  actor: string;
  action: string;
  reason: string;
  occurredAt: string;
  beforeValue?: string;
  afterValue?: string;
}

// The device's lowest-remaining filter core, shown in the list so operators
// can spot devices that need a core change without opening each one.
export interface DeviceAttentionCore {
  position: string;
  coreName: string;
  remainingPercent: number;
}

export interface Device {
  id: string;
  displayName: string;
  modelName: string;
  region: string;
  // Ward/commune; region is the province.
  ward?: string;
  connectivity: ProductConnectivity;
  /** `null` for non-IoT products — they never report a connection. */
  status: DeviceStatus | null;
  /** Platform-computed fault flag: device error code, sensor, expired core. */
  hasError: boolean;
  lastOnlineAt: string | null;
  manufacturedAt: string;
  batchCode: string;
  wifiSignalDbm: number | null;
  /** Round-trip latency of the last MQTT heartbeat. */
  latencyMs?: number;
  filterLifePercent: number;
  attentionCore?: DeviceAttentionCore;
  // Power state is independent of connection `status` — a powered-off
  // device stays connected so it can still receive a power-on command.
  powered: boolean;
  /** `null` for non-IoT products (no IoT module). */
  moduleFirmwareVersion: string | null;
  mainboardFirmwareVersion: string | null;
  owner?: DeviceOwner;
  latestTelemetry: DeviceTelemetry[];
  activatedAt?: string;
  installAddress: string;
  internalNote: string;
  tags: string[];
  lifecycleState: DeviceLifecycleState;
  warrantyStatus: DeviceWarrantyStatus;
  warrantyExpiresAt?: string;
  openTicketCount: number;
  openAppointmentCount: number;
  openAlertCount: number;
  automationCount: number;
  appSyncStatus: 'none' | 'queued';
  hasActiveOta: boolean;
  hasActiveRentalContract: boolean;
  sharedMembers: DeviceSharedMember[];
  ownerHistory: DeviceOwnerHistoryEntry[];
  operationLog: DeviceOperationLogEntry[];
  // §8.1/§11: device service entitlements row summary (excludes revoked/expired).
  entitlementsSummary: EntitlementSummary[];
}

export const deviceStatusSchema = z.enum(['online', 'offline']);
// List filter: also accepts `warning` (online with an error); see DeviceListFilters.
export const deviceStatusFilterSchema = z.enum([
  'online',
  'warning',
  'offline',
]);
export const deviceLifecycleStateSchema = z.enum([
  'active',
  'locked',
  'decommissioned',
]);
export const deviceWarrantyStatusSchema = z.enum([
  'active',
  'expiring',
  'expired',
  'none',
]);
export const deviceOwnerDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  phone_masked: z.string().optional(),
  address: z.string().optional(),
});

export const deviceTelemetryDtoSchema = z.object({
  metric_key: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  measured_at: z.string().datetime({ offset: true }),
});

export const deviceSharedMemberDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  permission: sharePermissionSchema,
  shared_at: z.string().datetime({ offset: true }),
});

export const deviceOwnerHistoryEntryDtoSchema = z.object({
  owner_id: z.string().min(1),
  owner_name: z.string().min(1),
  started_at: z.string().datetime({ offset: true }),
  ended_at: z.string().datetime({ offset: true }).optional(),
  reason: z.string().optional(),
});

export const deviceOperationLogEntryDtoSchema = z.object({
  id: z.string().min(1),
  actor: z.string().min(1),
  action: z.string().min(1),
  reason: z.string().min(1),
  occurred_at: z.string().datetime({ offset: true }),
  before_value: z.string().optional(),
  after_value: z.string().optional(),
});

export const deviceDtoSchema = z.object({
  device_id: z.string().min(1),
  display_name: z.string(),
  model_name: z.string().min(1),
  region: z.string().min(1),
  ward: z.string().min(1).optional(),
  connectivity: productConnectivitySchema,
  status: deviceStatusSchema.nullable(),
  // ⚠️ Assumption: the backend exposes the fault as a boolean next to
  // `status`; confirm the contract before the real API lands.
  has_error: z.boolean(),
  last_online_at: z.string().datetime({ offset: true }).nullable(),
  manufactured_at: z.string().datetime({ offset: true }),
  batch_code: z.string().min(1),
  wifi_signal_dbm: z.number().int().nullable(),
  latency_ms: z.number().int().nonnegative().optional(),
  filter_life_percent: z.number().min(0).max(100),
  attention_core: z
    .object({
      position: z.string().min(1),
      core_name: z.string().min(1),
      remaining_percent: z.number().min(0).max(100),
    })
    .optional(),
  powered: z.boolean(),
  module_firmware_version: z.string().min(1).nullable(),
  mainboard_firmware_version: z.string().min(1).nullable(),
  owner: deviceOwnerDtoSchema.optional(),
  latest_telemetry: z.array(deviceTelemetryDtoSchema),
  activated_at: z.string().datetime({ offset: true }).optional(),
  install_address: z.string(),
  internal_note: z.string(),
  tags: z.array(z.string()),
  lifecycle_state: deviceLifecycleStateSchema,
  warranty_status: deviceWarrantyStatusSchema,
  warranty_expires_at: z.string().datetime({ offset: true }).optional(),
  open_ticket_count: z.number().int().nonnegative(),
  open_appointment_count: z.number().int().nonnegative(),
  open_alert_count: z.number().int().nonnegative(),
  automation_count: z.number().int().nonnegative(),
  app_sync_status: z.enum(['none', 'queued']),
  has_active_ota: z.boolean(),
  has_active_rental_contract: z.boolean(),
  // Omitted for roles without device.pii.full (§3.4: owner block hidden).
  shared_members: z.array(deviceSharedMemberDtoSchema).optional(),
  owner_history: z.array(deviceOwnerHistoryEntryDtoSchema).optional(),
  operation_log: z.array(deviceOperationLogEntryDtoSchema),
  // Legacy records predate this field (spec §11): nullish → mapper default [].
  entitlements_summary: z.array(entitlementSummaryDtoSchema).nullish(),
});

export const devicePageDtoSchema = z.object({
  items: z.array(deviceDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const deviceStatusCountsDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  non_iot: z.number().int().nonnegative(),
  online: z.number().int().nonnegative(),
  warning: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(),
});

export type DeviceDto = z.infer<typeof deviceDtoSchema>;
export type DevicePageDto = z.infer<typeof devicePageDtoSchema>;

export interface RestoreDeviceInput {
  reason: string;
}

export interface SetLifecycleStateInput {
  lifecycleState: DeviceLifecycleState;
  reason: string;
}

export interface DeleteDeviceInput {
  reason: string;
}

export const deviceAuditChangeSchema = z.object({
  field: z.string().min(1),
  before_value: z.string(),
  after_value: z.string(),
});
export const deviceMutationSchema = z.object({
  reason: z.string().trim().min(1),
  changes: z.array(deviceAuditChangeSchema).min(1),
});
export const deviceLifecycleMutationSchema = deviceMutationSchema.extend({
  lifecycle_state: deviceLifecycleStateSchema,
});
