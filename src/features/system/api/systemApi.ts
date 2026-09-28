import { z } from 'zod';

import { apiClient } from '@/core/api/apiClient';
import { ApiError } from '@/core/api/error';
import type { PortalRole } from '@/core/auth/types';
import type { PageResponse } from '@/shared/types/pagination';

import {
  auditPageDtoSchema,
  backupDtoSchema,
  memberDtoSchema,
  memberOptionsDtoSchema,
  memberPageDtoSchema,
  roleGroupDtoSchema,
  systemConfigDtoSchema,
  type MemberListFilters,
  type AuditEntry,
  type AuditFilters,
  type Backup,
  type Member,
  type MemberFormValues,
  type MemberOptions,
  type RoleGroup,
  type RoleGroupInput,
  type SystemConfig,
} from '../schemas/systemSchemas';
import {
  toAuditEntry,
  toBackup,
  toCatalogItemDto,
  toConfigParamsDto,
  toMember,
  toPage,
  toRoleGroup,
  toSystemConfig,
} from './systemMapper';

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw new ApiError(
      'invalidResponse',
      'The server returned an invalid system response.',
      undefined,
      parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.map(String).join('.'),
      }))
    );
  }

  return parsed.data;
}

function query(entries: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

// ---- Members -------------------------------------------------------------

export async function getMembers(
  filters: MemberListFilters,
  signal?: AbortSignal
): Promise<PageResponse<Member>> {
  const raw = await apiClient.get<unknown>(
    `/system/members?${query({
      search: filters.search.trim(),
      role_id: filters.roleId,
      page: filters.page,
      page_size: filters.pageSize,
    })}`,
    { signal }
  );
  return toPage(parse(memberPageDtoSchema, raw), toMember);
}

// Admin lĩnh vực a System Admin owns (shown before it is locked or disabled).
export async function getOwnedAdmins(
  ownerId: string,
  signal?: AbortSignal
): Promise<Member[]> {
  const raw = await apiClient.get<unknown>(
    `/system/members?${query({ owner_id: ownerId, page_size: 100 })}`,
    { signal }
  );
  return parse(memberPageDtoSchema, raw).items.map(toMember);
}

export async function getMemberOptions(
  signal?: AbortSignal
): Promise<MemberOptions> {
  return parse(
    memberOptionsDtoSchema,
    await apiClient.get<unknown>('/system/member-options', { signal })
  );
}

function toMemberBody(values: MemberFormValues) {
  return {
    full_name: values.fullName.trim(),
    phone: values.phone.trim(),
    // Blank on edit means "keep the current password".
    ...(values.password ? { password: values.password } : {}),
    ...(values.roleId ? { role_id: values.roleId } : {}),
    ...(values.capabilities ? { capabilities: values.capabilities } : {}),
    assigned_regions: values.assignedRegions,
  };
}

export async function createMember(values: MemberFormValues): Promise<Member> {
  const raw = await apiClient.post<unknown>(
    '/system/members',
    toMemberBody(values)
  );
  return toMember(parse(memberDtoSchema, raw));
}

export async function updateMember(input: {
  id: string;
  values: MemberFormValues;
}): Promise<Member> {
  const raw = await apiClient.put<unknown>(
    `/system/members/${input.id}`,
    toMemberBody(input.values)
  );
  return toMember(parse(memberDtoSchema, raw));
}

export type MemberReasonAction =
  'lock' | 'unlock' | 'disable' | 'delete' | 'transfer';

// Every account action requires a reason that lands in the audit log.
// `transferToId` hands the owned Admin lĩnh vực over to another System Admin
// (mandatory for `transfer`, and for lock/disable of a System Admin who owns
// any).
export async function applyMemberReasonAction(input: {
  id: string;
  action: MemberReasonAction;
  reason: string;
  transferToId?: string | undefined;
}): Promise<void> {
  await apiClient.post<unknown>(`/system/members/${input.id}/${input.action}`, {
    reason: input.reason,
    ...(input.transferToId ? { transfer_to_id: input.transferToId } : {}),
  });
}

// ---- Role groups ---------------------------------------------------------

export async function getRoleGroups(
  signal?: AbortSignal
): Promise<RoleGroup[]> {
  const raw = await apiClient.get<unknown>('/system/role-groups', { signal });
  return parse(roleGroupDtoSchema.array(), raw).map(toRoleGroup);
}

export async function createRoleGroup(
  input: RoleGroupInput
): Promise<RoleGroup> {
  const raw = await apiClient.post<unknown>('/system/role-groups', {
    name: input.name,
    capabilities: input.capabilities,
    parent_id: input.parentId ?? null,
  });
  return toRoleGroup(parse(roleGroupDtoSchema, raw));
}

export async function updateRoleGroup(input: {
  id: PortalRole;
  group: RoleGroupInput;
}): Promise<RoleGroup> {
  const raw = await apiClient.put<unknown>(
    `/system/role-groups/${encodeURIComponent(input.id)}`,
    input.group
  );
  return toRoleGroup(parse(roleGroupDtoSchema, raw));
}

export async function deleteRoleGroup(id: PortalRole): Promise<void> {
  await apiClient.delete<unknown>(
    `/system/role-groups/${encodeURIComponent(id)}`
  );
}

// ---- Audit log (read-only: there is no write endpoint by design) ---------

function auditQuery(filters: AuditFilters): string {
  return query({
    actor: filters.actor.trim(),
    module: filters.module,
    action: filters.action.trim(),
    from: filters.from,
    to: filters.to,
    page: filters.page,
    page_size: filters.pageSize,
  });
}

export async function getAuditLogs(
  filters: AuditFilters,
  signal?: AbortSignal
): Promise<PageResponse<AuditEntry>> {
  const raw = await apiClient.get<unknown>(
    `/system/audit-logs?${auditQuery(filters)}`,
    { signal }
  );
  return toPage(parse(auditPageDtoSchema, raw), toAuditEntry);
}

// Export reuses the exact filters of the list being viewed (page ignored) and
// is itself audited by the backend.
export async function exportAuditLogs(
  filters: AuditFilters
): Promise<AuditEntry[]> {
  const raw = await apiClient.get<unknown>(
    `/system/audit-logs/export?${auditQuery(filters)}`
  );
  return parse(auditPageDtoSchema, raw).items.map(toAuditEntry);
}

// ---- Config & backups ----------------------------------------------------

export async function getSystemConfig(
  signal?: AbortSignal
): Promise<SystemConfig> {
  const raw = await apiClient.get<unknown>('/system/config', { signal });
  return toSystemConfig(parse(systemConfigDtoSchema, raw));
}

export async function updateSystemConfig(
  config: Pick<SystemConfig, 'params' | 'catalogs'>
): Promise<SystemConfig> {
  const raw = await apiClient.put<unknown>('/system/config', {
    params: toConfigParamsDto(config.params),
    catalogs: {
      model: config.catalogs.model.map(toCatalogItemDto),
      core: config.catalogs.core.map(toCatalogItemDto),
      region: config.catalogs.region.map(toCatalogItemDto),
    },
  });
  return toSystemConfig(parse(systemConfigDtoSchema, raw));
}

export async function getBackups(signal?: AbortSignal): Promise<Backup[]> {
  const raw = await apiClient.get<unknown>('/system/backups', { signal });
  return parse(backupDtoSchema.array(), raw).map(toBackup);
}

export async function createBackup(): Promise<Backup> {
  const raw = await apiClient.post<unknown>('/system/backups', {});
  return toBackup(parse(backupDtoSchema, raw));
}

export async function restoreBackup(input: {
  id: string;
  confirmCode: string;
}): Promise<void> {
  await apiClient.post<unknown>(`/system/backups/${input.id}/restore`, {
    confirm_code: input.confirmCode,
  });
}
