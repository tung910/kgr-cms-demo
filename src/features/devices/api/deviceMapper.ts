import type {
  Device,
  DeviceDto,
  DevicePageDto,
  DeviceTelemetry,
} from '../schemas/deviceSchemas';
import type { PageResponse } from '@/shared/types/pagination';

function mapTelemetry(
  telemetry: DeviceDto['latest_telemetry'][number]
): DeviceTelemetry {
  return {
    metricKey: telemetry.metric_key,
    value: telemetry.value,
    unit: telemetry.unit,
    measuredAt: telemetry.measured_at,
  };
}

export function mapDevice(dto: DeviceDto): Device {
  return {
    id: dto.device_id,
    displayName: dto.display_name,
    modelName: dto.model_name,
    region: dto.region,
    ...(dto.ward && { ward: dto.ward }),
    status: dto.status,
    lastOnlineAt: dto.last_online_at,
    manufacturedAt: dto.manufactured_at,
    batchCode: dto.batch_code,
    wifiSignalDbm: dto.wifi_signal_dbm,
    filterLifePercent: dto.filter_life_percent,
    ...(dto.attention_core && {
      attentionCore: {
        position: dto.attention_core.position,
        coreName: dto.attention_core.core_name,
        remainingPercent: dto.attention_core.remaining_percent,
      },
    }),
    powered: dto.powered,
    moduleFirmwareVersion: dto.module_firmware_version,
    mainboardFirmwareVersion: dto.mainboard_firmware_version,
    ...(dto.owner && {
      owner: {
        id: dto.owner.id,
        ...(dto.owner.name && { name: dto.owner.name }),
        ...(dto.owner.phone_masked && { phoneMasked: dto.owner.phone_masked }),
        ...(dto.owner.address && { address: dto.owner.address }),
      },
    }),
    latestTelemetry: dto.latest_telemetry.map(mapTelemetry),
    ...(dto.activated_at && { activatedAt: dto.activated_at }),
    installAddress: dto.install_address,
    internalNote: dto.internal_note,
    tags: dto.tags,
    lifecycleState: dto.lifecycle_state,
    warrantyStatus: dto.warranty_status,
    ...(dto.latency_ms !== undefined && { latencyMs: dto.latency_ms }),
    ...(dto.warranty_expires_at && {
      warrantyExpiresAt: dto.warranty_expires_at,
    }),
    openTicketCount: dto.open_ticket_count,
    openAppointmentCount: dto.open_appointment_count,
    openAlertCount: dto.open_alert_count,
    automationCount: dto.automation_count,
    appSyncStatus: dto.app_sync_status,
    hasActiveOta: dto.has_active_ota,
    hasActiveRentalContract: dto.has_active_rental_contract,
    sharedMembers: (dto.shared_members ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      ...(member.phone && { phone: member.phone }),
      ...(member.address && { address: member.address }),
      permission: member.permission,
      sharedAt: member.shared_at,
    })),
    ownerHistory: (dto.owner_history ?? []).map((entry) => ({
      ownerId: entry.owner_id,
      ownerName: entry.owner_name,
      startedAt: entry.started_at,
      ...(entry.ended_at && { endedAt: entry.ended_at }),
      ...(entry.reason && { reason: entry.reason }),
    })),
    operationLog: dto.operation_log.map((entry) => ({
      id: entry.id,
      actor: entry.actor,
      action: entry.action,
      reason: entry.reason,
      occurredAt: entry.occurred_at,
      beforeValue: entry.before_value,
      afterValue: entry.after_value,
    })),
  };
}

export function mapDevicePage(dto: DevicePageDto): PageResponse<Device> {
  return {
    items: dto.items.map(mapDevice),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}
