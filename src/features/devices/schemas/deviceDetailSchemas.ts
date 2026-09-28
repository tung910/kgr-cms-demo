import { z } from 'zod';

import {
  deviceStatusSchema,
  deviceWarrantyStatusSchema,
  type DeviceStatus,
  type DeviceWarrantyStatus,
} from './deviceSchemas';

// M03 §4.2 — the four history blocks beyond real-time telemetry. Modeled as
// sub-resources of the device (`/devices/:id/...`) rather than imported from
// the alerts/firmware/warranty slices, which are still placeholder pages —
// swap the source in api/deviceDetailApi.ts once those modules exist.

export const alertSeveritySchema = z.enum(['P1', 'P2', 'P3', 'P4']);
export const alertHistoryStatusSchema = z.enum([
  'open',
  'assigned',
  'in_progress',
  'closed',
]);

export const alertHistoryEntryDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  severity: alertSeveritySchema,
  status: alertHistoryStatusSchema,
  occurred_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).optional(),
});

export const filterChangeEntryDtoSchema = z.object({
  id: z.string().min(1),
  position: z.string().min(1),
  core_name: z.string().min(1),
  old_serial: z.string().optional(),
  new_serial: z.string().min(1),
  changed_at: z.string().datetime({ offset: true }),
  channel: z.enum(['app', 'technician']),
});

export const otaHistoryEntryDtoSchema = z.object({
  id: z.string().min(1),
  track: z.enum(['module', 'mainboard']),
  from_version: z.string().min(1),
  to_version: z.string().min(1),
  result: z.enum(['success', 'failed', 'rolled_back']),
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).optional(),
});

export const serviceHistoryEntryDtoSchema = z.object({
  id: z.string().min(1),
  ticket_id: z.string().min(1),
  type: z.enum(['warranty', 'maintenance']),
  summary: z.string().min(1),
  technician: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'done']),
  scheduled_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).optional(),
});

export type AlertHistoryEntryDto = z.infer<typeof alertHistoryEntryDtoSchema>;
export type FilterChangeEntryDto = z.infer<typeof filterChangeEntryDtoSchema>;
export type OtaHistoryEntryDto = z.infer<typeof otaHistoryEntryDtoSchema>;
export type ServiceHistoryEntryDto = z.infer<
  typeof serviceHistoryEntryDtoSchema
>;

export interface AlertHistoryEntry {
  id: string;
  code: string;
  title: string;
  severity: z.infer<typeof alertSeveritySchema>;
  status: z.infer<typeof alertHistoryStatusSchema>;
  occurredAt: string;
  closedAt?: string;
}

export interface FilterChangeEntry {
  id: string;
  position: string;
  coreName: string;
  oldSerial?: string;
  newSerial: string;
  changedAt: string;
  channel: 'app' | 'technician';
}

export interface OtaHistoryEntry {
  id: string;
  track: 'module' | 'mainboard';
  fromVersion: string;
  toVersion: string;
  result: 'success' | 'failed' | 'rolled_back';
  startedAt: string;
  completedAt?: string;
}

export interface ServiceHistoryEntry {
  id: string;
  ticketId: string;
  type: 'warranty' | 'maintenance';
  summary: string;
  technician?: string;
  status: 'scheduled' | 'in_progress' | 'done';
  scheduledAt: string;
  completedAt?: string;
}

// M03.1 core-life alert block. ER00056→ER00060 at the warning threshold,
// ER00061→ER00065 at the critical one — spec only defines codes for
// positions 1-5, so a higher-position core (e.g. the 7-core model) simply
// has no dedicated code and is skipped.
export const coreAlertStatusSchema = z.enum(['open', 'assigned']);
export const coreAlertDtoSchema = z.object({
  position: z.string().min(1),
  core_name: z.string().min(1),
  used_percent: z.number().min(0),
  threshold_percent: z.number().min(0).max(100),
  error_code: z.string().min(1),
  replacement_sku: z.string().min(1),
  status: coreAlertStatusSchema,
});
export type CoreAlertDto = z.infer<typeof coreAlertDtoSchema>;
export interface CoreAlert {
  position: string;
  coreName: string;
  usedPercent: number;
  thresholdPercent: number;
  errorCode: string;
  replacementSku: string;
  status: 'open' | 'assigned';
}

// Diagnostics job — POR: device online -> package back in <30s, saved and
// re-viewable (not shown once and discarded).
export const diagnosticsJobStatusSchema = z.enum([
  'pending',
  'ready',
  'failed',
]);
export const diagnosticsMetricDtoSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});
export const diagnosticsJobDtoSchema = z.object({
  id: z.string().min(1),
  requested_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).optional(),
  status: diagnosticsJobStatusSchema,
  metrics: z.array(diagnosticsMetricDtoSchema).optional(),
  recent_error_codes: z.array(z.string()).optional(),
});
export type DiagnosticsJobDto = z.infer<typeof diagnosticsJobDtoSchema>;
export interface DiagnosticsJob {
  id: string;
  requestedAt: string;
  completedAt?: string;
  status: 'pending' | 'ready' | 'failed';
  metrics?: Array<{ label: string; value: string }>;
  recentErrorCodes?: string[];
}

// Device command (M03 "điều khiển hỗ trợ"). The server enforces the
// power-off business conditions — a 422 lists which ones failed.
export const deviceCommandKindSchema = z.enum([
  'power_on',
  'power_off',
  'set_hot_tank',
  'flush_membrane',
  'reboot',
  'ping',
]);
export type DeviceCommandKind = z.infer<typeof deviceCommandKindSchema>;

// §3.4 water quality chart — TDS in (source) and out (drinking) over a window.
export const telemetryRangeSchema = z.enum(['24h', '7d', '30d']);
export type TelemetryRange = z.infer<typeof telemetryRangeSchema>;
export const telemetryPointDtoSchema = z.object({
  measured_at: z.string().datetime({ offset: true }),
  tds_in_ppm: z.number().nullable(),
  tds_out_ppm: z.number().nullable(),
});
export type TelemetryPointDto = z.infer<typeof telemetryPointDtoSchema>;
export interface TelemetryPoint {
  measuredAt: string;
  tdsInPpm: number | null;
  tdsOutPpm: number | null;
}

// Per-core remaining life plus the health thresholds from the M04.1 config
// (§3.4: tốt / kém / quá kém). The UI compares, never invents, thresholds.
export const filterCoreStatusDtoSchema = z.object({
  position: z.string().min(1),
  core_name: z.string().min(1),
  core_type: z.string().min(1),
  function: z.string().min(1).optional(),
  sku_name: z.string().min(1).optional(),
  remaining_days: z.number().int(),
  total_days: z.number().int().positive(),
  warning_days: z.number().int().nonnegative(),
  poor_percent: z.number().min(0).max(100),
  critical_percent: z.number().min(0).max(100),
});
export type FilterCoreStatusDto = z.infer<typeof filterCoreStatusDtoSchema>;
export interface FilterCoreStatus {
  position: string;
  coreName: string;
  coreType: string;
  purpose?: string;
  skuName?: string;
  remainingDays: number;
  totalDays: number;
  poorPercent: number;
  criticalPercent: number;
}

// Remote command audit trail (ACK timeout 30s). Immutable server-side.
export const deviceCommandStatusSchema = z.enum([
  'pending',
  'ack',
  'timeout',
  'rejected',
]);
export const deviceCommandLogEntryDtoSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  actor: z.string().min(1),
  reason: z.string().min(1),
  requested_at: z.string().datetime({ offset: true }),
  status: deviceCommandStatusSchema,
});
export type DeviceCommandLogEntryDto = z.infer<
  typeof deviceCommandLogEntryDtoSchema
>;
export interface DeviceCommandLogEntry {
  id: string;
  command: string;
  actor: string;
  reason: string;
  requestedAt: string;
  status: z.infer<typeof deviceCommandStatusSchema>;
}

// M03.1 "từ thiết bị mở được sang hồ sơ khách hàng" + M05 hồ sơ khách hàng.
// Scoped to the device so every device.read role can open it; PII is masked
// server-side per role (NĐ 13/2023) and `pii_masked` tells the UI why.
export const deviceOwnerProfileDeviceDtoSchema = z.object({
  device_id: z.string().min(1),
  display_name: z.string(),
  model_name: z.string().min(1),
  status: deviceStatusSchema,
  warranty_status: deviceWarrantyStatusSchema,
  warranty_expires_at: z.string().datetime({ offset: true }).optional(),
  last_online_at: z.string().datetime({ offset: true }).nullable(),
});
export const deviceOwnerProfileDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  region: z.string().optional(),
  joined_at: z.string().datetime({ offset: true }).optional(),
  pii_masked: z.boolean(),
  devices: z.array(deviceOwnerProfileDeviceDtoSchema),
});
export type DeviceOwnerProfileDto = z.infer<typeof deviceOwnerProfileDtoSchema>;
export interface DeviceOwnerProfileDevice {
  id: string;
  displayName: string;
  modelName: string;
  status: DeviceStatus;
  warrantyStatus: DeviceWarrantyStatus;
  warrantyExpiresAt?: string;
  lastOnlineAt: string | null;
}
export interface DeviceOwnerProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  region?: string;
  joinedAt?: string;
  piiMasked: boolean;
  devices: DeviceOwnerProfileDevice[];
}

// §3.4b owner change — customers the operator can transfer the device to.
// Device-scoped so the devices slice never imports from features/customers.
export const ownerCandidateDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
});
export type OwnerCandidateDto = z.infer<typeof ownerCandidateDtoSchema>;
export interface OwnerCandidate {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

// The backend notifies the previous owner in the app (3.4b note).
export const ownerMutationResultDtoSchema = z.object({
  previous_owner_notified: z.boolean(),
});
export type OwnerMutationResultDto = z.infer<
  typeof ownerMutationResultDtoSchema
>;

// §3.4d online/offline history. `duration_seconds` is how long the device
// stayed in that state.
export const connectivityEventDtoSchema = z.object({
  id: z.string().min(1),
  event: z.enum(['online', 'offline']),
  occurred_at: z.string().datetime({ offset: true }),
  duration_seconds: z.number().int().nonnegative().optional(),
});
export type ConnectivityEventDto = z.infer<typeof connectivityEventDtoSchema>;
export interface ConnectivityEvent {
  id: string;
  event: 'online' | 'offline';
  occurredAt: string;
  durationSeconds?: number;
}
