import type { PageResponse } from '@/shared/types/pagination';

import type {
  AuditEntry,
  AuditEntryDto,
  Backup,
  BackupDto,
  CatalogItem,
  CatalogItemDto,
  ConfigParams,
  ConfigParamsDto,
  Member,
  MemberDto,
  RoleGroup,
  RoleGroupDto,
  SystemConfig,
  SystemConfigDto,
} from '../schemas/systemSchemas';

export function toPage<TDto, TModel>(
  page: { items: TDto[]; page: number; page_size: number; total: number },
  map: (dto: TDto) => TModel
): PageResponse<TModel> {
  return {
    items: page.items.map(map),
    page: page.page,
    pageSize: page.page_size,
    total: page.total,
  };
}

export function toMember(dto: MemberDto): Member {
  return {
    id: dto.id,
    fullName: dto.full_name,
    phone: dto.phone,
    roleId: dto.role_id,
    roleName: dto.role_name,
    status: dto.status,
    lastAccessAt: dto.last_access_at,
    assignedRegions: dto.assigned_regions,
    lockedReason: dto.locked_reason,
    level: dto.level,
    parentId: dto.parent_id,
    ownerSystemAdminId: dto.owner_system_admin_id,
    capabilities: dto.capabilities,
    inactiveCapabilities: dto.inactive_capabilities,
    manageable: dto.manageable,
    transferable: dto.transferable,
  };
}

export function toRoleGroup(dto: RoleGroupDto): RoleGroup {
  return {
    id: dto.id,
    name: dto.name,
    isSystem: dto.is_system,
    locked: dto.locked,
    memberCount: dto.member_count,
    level: dto.level,
    parentId: dto.parent_id,
    parentCapabilities: dto.parent_capabilities,
    capabilities: dto.capabilities,
  };
}

export function toAuditEntry(dto: AuditEntryDto): AuditEntry {
  return {
    id: dto.id,
    occurredAt: dto.occurred_at,
    actorId: dto.actor_id,
    actorName: dto.actor_name,
    ip: dto.ip,
    module: dto.module,
    action: dto.action,
    target: dto.target,
    before: dto.before,
    after: dto.after,
    reason: dto.reason,
  };
}

function toCatalogItems(items: CatalogItemDto[]): CatalogItem[] {
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    parentCode: item.parent_code,
  }));
}

export function toSystemConfig(dto: SystemConfigDto): SystemConfig {
  const p = dto.params;
  return {
    params: {
      tdsThresholdRegion: p.tds_threshold_region,
      otaAutoPauseRate: p.ota_auto_pause_rate,
      deviceAckTimeout: p.device_ack_timeout,
      slaBySeverity: p.sla_by_severity,
      warrantyExpiringDays: p.warranty_expiring_days,
      qrAnomalyRate: p.qr_anomaly_rate,
      alertAutoClose: p.alert_auto_close,
      loginMaxFailed: p.login_max_failed,
      lockoutMinutes: p.lockout_minutes,
      sessionTimeoutMinutes: p.session_timeout_minutes,
      passwordMinLength: p.password_min_length,
    },
    catalogs: {
      model: toCatalogItems(dto.catalogs.model),
      core: toCatalogItems(dto.catalogs.core),
      region: toCatalogItems(dto.catalogs.region),
    },
    updatedAt: dto.updated_at,
  };
}

export function toConfigParamsDto(p: ConfigParams): ConfigParamsDto {
  return {
    tds_threshold_region: p.tdsThresholdRegion,
    ota_auto_pause_rate: p.otaAutoPauseRate,
    device_ack_timeout: p.deviceAckTimeout,
    sla_by_severity: p.slaBySeverity,
    warranty_expiring_days: p.warrantyExpiringDays,
    qr_anomaly_rate: p.qrAnomalyRate,
    alert_auto_close: p.alertAutoClose,
    login_max_failed: p.loginMaxFailed,
    lockout_minutes: p.lockoutMinutes,
    session_timeout_minutes: p.sessionTimeoutMinutes,
    password_min_length: p.passwordMinLength,
  };
}

export function toCatalogItemDto(item: CatalogItem): CatalogItemDto {
  return { code: item.code, name: item.name, parent_code: item.parentCode };
}

export function toBackup(dto: BackupDto): Backup {
  return {
    id: dto.id,
    code: dto.code,
    kind: dto.kind,
    createdAt: dto.created_at,
    sizeMb: dto.size_mb,
    createdBy: dto.created_by,
  };
}
