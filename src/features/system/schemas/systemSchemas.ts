import { z } from 'zod';

import { isPortalRole, type PortalRole } from '@/core/auth/types';
import { CAPABILITIES, type Capability } from '@/core/permissions/capabilities';

import { ACCOUNT_LEVELS } from '../constants/accountLevels';

const roleIdSchema = z.custom<PortalRole>(isPortalRole);

// ---- Members (SCR-02/03) -------------------------------------------------

export type AccountLevel = (typeof ACCOUNT_LEVELS)[number]['value'];
const accountLevelSchema = z.custom<AccountLevel>((value) =>
  ACCOUNT_LEVELS.some((item) => item.value === value)
);

// `locked` is temporary; `disabled` is the soft end state of an account.
export const memberStatusSchema = z.enum(['active', 'locked', 'disabled']);
export type MemberStatus = z.infer<typeof memberStatusSchema>;

export const memberDtoSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  role_id: roleIdSchema,
  role_name: z.string(),
  status: memberStatusSchema,
  last_access_at: z.string().nullable(),
  assigned_regions: z.array(z.string()),
  locked_reason: z.string().nullable(),
  level: accountLevelSchema,
  parent_id: z.string().nullable(),
  owner_system_admin_id: z.string().nullable(),
  // Effective = group capabilities ∩ what the parent chain still holds;
  // `inactive` ones are in the group but no longer backed by a superior.
  capabilities: z.array(z.enum(CAPABILITIES)),
  inactive_capabilities: z.array(z.enum(CAPABILITIES)),
  // The server decides whether the caller may act on this row (no privilege
  // escalation); the UI only reflects it.
  manageable: z.boolean(),
  // Only SP-Admin may hand an Admin lĩnh vực to another System Admin.
  transferable: z.boolean(),
});
export type MemberDto = z.infer<typeof memberDtoSchema>;

export const memberPageDtoSchema = z.object({
  items: z.array(memberDtoSchema),
  page: z.number(),
  page_size: z.number(),
  total: z.number(),
});

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  roleId: PortalRole;
  roleName: string;
  status: MemberStatus;
  lastAccessAt: string | null;
  assignedRegions: string[];
  lockedReason: string | null;
  level: AccountLevel;
  parentId: string | null;
  ownerSystemAdminId: string | null;
  capabilities: Capability[];
  inactiveCapabilities: Capability[];
  manageable: boolean;
  transferable: boolean;
}

export interface MemberListFilters {
  search: string;
  roleId?: PortalRole | undefined;
  page: number;
  pageSize: number;
}

// Search of the combined members / role groups screen.
export interface MemberAccessSearch extends MemberListFilters {
  tab: 'members' | 'roles';
  groupId?: PortalRole | undefined;
}

export interface MemberFormValues {
  fullName: string;
  phone: string;
  password?: string | undefined;
  roleId?: PortalRole | undefined;
  // Creating a System Admin: the permissions SP-Admin ticks for its own group.
  capabilities?: Capability[] | undefined;
  assignedRegions: string[];
}

export const memberOptionsDtoSchema = z.object({
  // `level` = the account tier the group is meant for.
  roles: z.array(
    z.object({ id: roleIdSchema, name: z.string(), level: accountLevelSchema })
  ),
  regions: z.array(z.object({ code: z.string(), name: z.string() })),
  // Level of the account the caller would create; null = cannot create.
  create_level: accountLevelSchema.nullable(),
  // Most a new System Admin may be given (only when creating one).
  create_capabilities: z.array(z.enum(CAPABILITIES)).nullable(),
  // Active System Admins, the targets of an ownership transfer (SP-Admin only).
  system_admins: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type MemberOptions = z.infer<typeof memberOptionsDtoSchema>;

// ---- Role groups (SCR-04) ------------------------------------------------

export const roleGroupDtoSchema = z.object({
  id: roleIdSchema,
  name: z.string(),
  is_system: z.boolean(),
  // The Super Admin group is fixed: nobody can narrow or delete it.
  locked: z.boolean(),
  member_count: z.number(),
  level: accountLevelSchema,
  // Display nesting only: the Admin lĩnh vực groups sit under System Admin.
  parent_id: roleIdSchema.nullable(),
  // What the parent holds: the ceiling for this group (its parent may be
  // hidden from the viewer, so the server sends the ceiling itself).
  parent_capabilities: z.array(z.enum(CAPABILITIES)).nullable(),
  capabilities: z.array(z.enum(CAPABILITIES)),
});
export type RoleGroupDto = z.infer<typeof roleGroupDtoSchema>;

export interface RoleGroup {
  id: PortalRole;
  name: string;
  isSystem: boolean;
  locked: boolean;
  memberCount: number;
  level: AccountLevel;
  parentId: PortalRole | null;
  parentCapabilities: RoleGroupDto['capabilities'] | null;
  capabilities: RoleGroupDto['capabilities'];
}

export interface RoleGroupInput {
  name: string;
  capabilities: RoleGroup['capabilities'];
  // Create only: the System Admin group a new Admin lĩnh vực group sits under.
  parentId?: PortalRole | undefined;
}

// ---- Audit log (SCR-34) --------------------------------------------------

const auditValueSchema = z.record(z.string(), z.unknown()).nullable();

export const auditEntryDtoSchema = z.object({
  id: z.string(),
  occurred_at: z.string(),
  actor_id: z.string(),
  actor_name: z.string(),
  ip: z.string(),
  module: z.string(),
  action: z.string(),
  target: z.string(),
  before: auditValueSchema,
  after: auditValueSchema,
  reason: z.string().nullable(),
});
export type AuditEntryDto = z.infer<typeof auditEntryDtoSchema>;

export const auditPageDtoSchema = z.object({
  items: z.array(auditEntryDtoSchema),
  page: z.number(),
  page_size: z.number(),
  total: z.number(),
});

export interface AuditEntry {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  ip: string;
  module: string;
  action: string;
  target: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
}

export interface AuditFilters {
  actor: string;
  module?: string | undefined;
  action: string;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  pageSize: number;
}

// ---- System config (SCR-35) ----------------------------------------------

export const CATALOG_KEYS = ['model', 'core', 'region'] as const;
export type CatalogKey = (typeof CATALOG_KEYS)[number];

const slaMinutesSchema = z.number().int().positive().nullable();

// Ranges per CMS_IMPLEMENTATION_PLAN.md §3.1 SCR-35. The mock backend parses
// the PUT body with this same schema, so the ranges are enforced there too.
export const configParamsDtoSchema = z.object({
  campaign_core_days: z.number().int().min(1).max(365),
  campaign_quiet_start_hour: z.number().int().min(0).max(23),
  campaign_quiet_end_hour: z.number().int().min(0).max(23),
  campaign_frequency_limit: z.number().int().min(1).max(100),
  campaign_frequency_days: z.number().int().min(1).max(365),
  campaign_attribution_days: z.number().int().min(1).max(365),
  campaign_cooldown_days: z.number().int().min(1).max(365),
  campaign_repurchase_days: z.number().int().min(1).max(730),
  campaign_booking_revenue: z.number().int().min(0).max(100000000),
  campaign_qr_revenue: z.number().int().min(0).max(100000000),
  tds_threshold_region: z.number().int().min(1).max(1000),
  ota_auto_pause_rate: z.number().min(0.1).max(100),
  device_ack_timeout: z.number().int().min(5).max(300),
  sla_by_severity: z.object({
    critical: slaMinutesSchema,
    medium: slaMinutesSchema,
    low: slaMinutesSchema,
  }),
  warranty_expiring_days: z.number().int().min(1).max(365),
  qr_anomaly_rate: z.number().min(0.1).max(100),
  alert_auto_close: z.boolean(),
  login_max_failed: z.number().int().min(1).max(20),
  lockout_minutes: z.number().int().min(1).max(1440),
  session_timeout_minutes: z.number().int().min(1).max(1440),
  password_min_length: z.number().int().min(6).max(64),
});
export type ConfigParamsDto = z.infer<typeof configParamsDtoSchema>;

const catalogItemDtoSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  parent_code: z.string().nullable(),
});
export type CatalogItemDto = z.infer<typeof catalogItemDtoSchema>;

export const systemConfigDtoSchema = z.object({
  params: configParamsDtoSchema,
  catalogs: z.object({
    model: z.array(catalogItemDtoSchema),
    core: z.array(catalogItemDtoSchema),
    region: z.array(catalogItemDtoSchema),
  }),
  updated_at: z.string(),
});
export type SystemConfigDto = z.infer<typeof systemConfigDtoSchema>;

export interface CatalogItem {
  code: string;
  name: string;
  parentCode: string | null;
}

export interface ConfigParams {
  campaignCoreDays: number;
  campaignQuietStartHour: number;
  campaignQuietEndHour: number;
  campaignFrequencyLimit: number;
  campaignFrequencyDays: number;
  campaignAttributionDays: number;
  campaignCooldownDays: number;
  campaignRepurchaseDays: number;
  campaignBookingRevenue: number;
  campaignQrRevenue: number;
  tdsThresholdRegion: number;
  otaAutoPauseRate: number;
  deviceAckTimeout: number;
  slaBySeverity: {
    critical: number | null;
    medium: number | null;
    low: number | null;
  };
  warrantyExpiringDays: number;
  qrAnomalyRate: number;
  alertAutoClose: boolean;
  loginMaxFailed: number;
  lockoutMinutes: number;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
}

export interface SystemConfig {
  params: ConfigParams;
  catalogs: Record<CatalogKey, CatalogItem[]>;
  updatedAt: string;
}

// ---- Backups (SCR-35) ----------------------------------------------------

export const backupDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  kind: z.enum(['scheduled', 'manual']),
  created_at: z.string(),
  size_mb: z.number(),
  created_by: z.string().nullable(),
});
export type BackupDto = z.infer<typeof backupDtoSchema>;

export interface Backup {
  id: string;
  code: string;
  kind: BackupDto['kind'];
  createdAt: string;
  sizeMb: number;
  createdBy: string | null;
}
