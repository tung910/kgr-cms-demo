import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';

import {
  alertHistoryEntryDtoSchema,
  connectivityEventDtoSchema,
  coreAlertDtoSchema,
  deviceCommandLogEntryDtoSchema,
  deviceOwnerProfileDtoSchema,
  diagnosticsJobDtoSchema,
  filterCoreStatusDtoSchema,
  telemetryPointDtoSchema,
  filterChangeEntryDtoSchema,
  otaHistoryEntryDtoSchema,
  ownerCandidateDtoSchema,
  ownerMutationResultDtoSchema,
  serviceHistoryEntryDtoSchema,
  type AlertHistoryEntry,
  type ConnectivityEvent,
  type CoreAlert,
  type DeviceCommandKind,
  type DeviceCommandLogEntry,
  type DeviceOwnerProfile,
  type DiagnosticsJob,
  type FilterChangeEntry,
  type FilterCoreStatus,
  type OtaHistoryEntry,
  type OwnerCandidate,
  type ServiceHistoryEntry,
  type TelemetryPoint,
  type TelemetryRange,
} from '../schemas/deviceDetailSchemas';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('devices:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function devicePath(deviceId: string, suffix: string): string {
  return `/devices/${encodeURIComponent(deviceId)}${suffix}`;
}

function requireReason(reason: string): string {
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (normalizedReason) return normalizedReason;
  throw new ApiError('validation', i18n.t('devices:errors.invalidInput'), 400, {
    code: 'invalidInput',
  });
}

export async function getAlertHistory(
  deviceId: string,
  signal?: AbortSignal
): Promise<AlertHistoryEntry[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/alerts'),
    {
      signal,
    }
  );
  const parsed = alertHistoryEntryDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    severity: item.severity,
    status: item.status,
    occurredAt: item.occurred_at,
    ...(item.closed_at && { closedAt: item.closed_at }),
  }));
}

export async function getFilterChangeHistory(
  deviceId: string,
  signal?: AbortSignal
): Promise<FilterChangeEntry[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/filter-changes'),
    { signal }
  );
  const parsed = filterChangeEntryDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    position: item.position,
    coreName: item.core_name,
    ...(item.old_serial && { oldSerial: item.old_serial }),
    newSerial: item.new_serial,
    changedAt: item.changed_at,
    channel: item.channel,
  }));
}

export async function getOtaHistory(
  deviceId: string,
  signal?: AbortSignal
): Promise<OtaHistoryEntry[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/ota-history'),
    { signal }
  );
  const parsed = otaHistoryEntryDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    track: item.track,
    fromVersion: item.from_version,
    toVersion: item.to_version,
    result: item.result,
    startedAt: item.started_at,
    ...(item.completed_at && { completedAt: item.completed_at }),
  }));
}

export async function getServiceHistory(
  deviceId: string,
  signal?: AbortSignal
): Promise<ServiceHistoryEntry[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/service-history'),
    { signal }
  );
  const parsed = serviceHistoryEntryDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    ticketId: item.ticket_id,
    type: item.type,
    summary: item.summary,
    ...(item.technician && { technician: item.technician }),
    status: item.status,
    scheduledAt: item.scheduled_at,
    ...(item.completed_at && { completedAt: item.completed_at }),
  }));
}

export async function getCoreAlerts(
  deviceId: string,
  signal?: AbortSignal
): Promise<CoreAlert[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/core-alerts'),
    { signal }
  );
  const parsed = coreAlertDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    position: item.position,
    coreName: item.core_name,
    usedPercent: item.used_percent,
    thresholdPercent: item.threshold_percent,
    errorCode: item.error_code,
    replacementSku: item.replacement_sku,
    status: item.status,
  }));
}

export async function createServiceTicketFromCoreAlert(
  deviceId: string,
  position: string,
  reason: string
): Promise<void> {
  await apiClient.post<unknown>(devicePath(deviceId, '/service-tickets'), {
    reason,
    core_position: position,
  });
}

function mapDiagnosticsJob(dto: {
  id: string;
  requested_at: string;
  completed_at?: string;
  status: 'pending' | 'ready' | 'failed';
  metrics?: Array<{ label: string; value: string }>;
  recent_error_codes?: string[];
}): DiagnosticsJob {
  return {
    id: dto.id,
    requestedAt: dto.requested_at,
    status: dto.status,
    ...(dto.completed_at && { completedAt: dto.completed_at }),
    ...(dto.metrics && { metrics: dto.metrics }),
    ...(dto.recent_error_codes && { recentErrorCodes: dto.recent_error_codes }),
  };
}

export async function listDiagnosticsJobs(
  deviceId: string,
  signal?: AbortSignal
): Promise<DiagnosticsJob[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/diagnostics'),
    { signal }
  );
  const parsed = diagnosticsJobDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map(mapDiagnosticsJob);
}

export async function requestDiagnostics(
  deviceId: string
): Promise<DiagnosticsJob> {
  const response = await apiClient.post<unknown>(
    devicePath(deviceId, '/diagnostics'),
    {}
  );
  const parsed = diagnosticsJobDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapDiagnosticsJob(parsed.data);
}

export async function getDiagnosticsJob(
  deviceId: string,
  jobId: string,
  signal?: AbortSignal
): Promise<DiagnosticsJob> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, `/diagnostics/${encodeURIComponent(jobId)}`),
    { signal }
  );
  const parsed = diagnosticsJobDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapDiagnosticsJob(parsed.data);
}

// The server is the source of truth for the power-off business conditions
// (POR: 20 unmet-condition cases must all be rejected). A 422 comes back
// with { message, unmet_conditions } via ApiError.details.
export async function sendDeviceCommand(
  deviceId: string,
  command: DeviceCommandKind,
  reason: string
): Promise<void> {
  await apiClient.post<unknown>(devicePath(deviceId, '/commands'), {
    command,
    reason,
  });
}

export async function getTelemetryHistory(
  deviceId: string,
  range: TelemetryRange,
  signal?: AbortSignal
): Promise<TelemetryPoint[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, `/telemetry-history?range=${range}`),
    { signal }
  );
  const parsed = telemetryPointDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    measuredAt: item.measured_at,
    tdsInPpm: item.tds_in_ppm,
    tdsOutPpm: item.tds_out_ppm,
  }));
}

export async function getFilterCoreStatuses(
  deviceId: string,
  signal?: AbortSignal
): Promise<FilterCoreStatus[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/filter-cores'),
    { signal }
  );
  const parsed = filterCoreStatusDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    position: item.position,
    coreName: item.core_name,
    coreType: item.core_type,
    ...(item.function && { purpose: item.function }),
    ...(item.sku_name && { skuName: item.sku_name }),
    remainingDays: item.remaining_days,
    totalDays: item.total_days,
    poorPercent: item.poor_percent,
    criticalPercent: item.critical_percent,
  }));
}

export async function getCommandLog(
  deviceId: string,
  signal?: AbortSignal
): Promise<DeviceCommandLogEntry[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/commands'),
    { signal }
  );
  const parsed = deviceCommandLogEntryDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    command: item.command,
    actor: item.actor,
    reason: item.reason,
    requestedAt: item.requested_at,
    status: item.status,
  }));
}

export async function getDeviceOwnerProfile(
  deviceId: string,
  signal?: AbortSignal
): Promise<DeviceOwnerProfile> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/owner'),
    { signal }
  );
  const parsed = deviceOwnerProfileDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  const dto = parsed.data;
  return {
    id: dto.id,
    name: dto.name,
    ...(dto.phone && { phone: dto.phone }),
    ...(dto.email && { email: dto.email }),
    ...(dto.region && { region: dto.region }),
    ...(dto.joined_at && { joinedAt: dto.joined_at }),
    piiMasked: dto.pii_masked,
    devices: dto.devices.map((item) => ({
      id: item.device_id,
      displayName: item.display_name,
      modelName: item.model_name,
      status: item.status,
      warrantyStatus: item.warranty_status,
      ...(item.warranty_expires_at && {
        warrantyExpiresAt: item.warranty_expires_at,
      }),
      lastOnlineAt: item.last_online_at,
    })),
  };
}

export async function searchOwnerCandidates(
  deviceId: string,
  query: string,
  signal?: AbortSignal
): Promise<OwnerCandidate[]> {
  const response = await apiClient.get<unknown>(
    devicePath(
      deviceId,
      `/owner-candidates?q=${encodeURIComponent(query.trim())}`
    ),
    { signal }
  );
  const parsed = ownerCandidateDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    name: item.name,
    phone: item.phone,
    ...(item.address && { address: item.address }),
  }));
}

function parseOwnerMutationResult(response: unknown): {
  previousOwnerNotified: boolean;
} {
  const parsed = ownerMutationResultDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return { previousOwnerNotified: parsed.data.previous_owner_notified };
}

// §3.4b: the server closes the ownership period, writes the audit entry
// (before/after) and notifies the previous owner.
export async function changeDeviceOwner(
  deviceId: string,
  customerId: string,
  reason: string
): Promise<{ previousOwnerNotified: boolean }> {
  const normalizedReason = requireReason(reason);
  return parseOwnerMutationResult(
    await apiClient.put<unknown>(devicePath(deviceId, '/owner'), {
      customer_id: customerId,
      reason: normalizedReason,
    })
  );
}

// POST, not DELETE: the transport DELETE has no body and the reason is required.
export async function removeDeviceOwner(
  deviceId: string,
  reason: string
): Promise<{ previousOwnerNotified: boolean }> {
  const normalizedReason = requireReason(reason);
  return parseOwnerMutationResult(
    await apiClient.post<unknown>(devicePath(deviceId, '/owner/remove'), {
      reason: normalizedReason,
    })
  );
}

export async function revokeSharedMember(
  deviceId: string,
  memberId: string,
  reason: string
): Promise<void> {
  const normalizedReason = requireReason(reason);
  await apiClient.post<unknown>(
    devicePath(
      deviceId,
      `/shared-members/${encodeURIComponent(memberId)}/revoke`
    ),
    { reason: normalizedReason }
  );
}

export async function getConnectivityHistory(
  deviceId: string,
  signal?: AbortSignal
): Promise<ConnectivityEvent[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/connectivity-history'),
    { signal }
  );
  const parsed = connectivityEventDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    event: item.event,
    occurredAt: item.occurred_at,
    ...(item.duration_seconds !== undefined && {
      durationSeconds: item.duration_seconds,
    }),
  }));
}
