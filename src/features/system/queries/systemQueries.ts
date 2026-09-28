import { queryOptions } from '@tanstack/react-query';

import {
  getAuditLogs,
  getBackups,
  getMemberOptions,
  getMembers,
  getOwnedAdmins,
  getRoleGroups,
  getSystemConfig,
} from '../api/systemApi';
import type { AuditFilters, MemberListFilters } from '../schemas/systemSchemas';

export const systemQueries = {
  all: ['system'] as const,
  members: (filters: MemberListFilters) =>
    queryOptions({
      queryKey: [...systemQueries.all, 'members', filters] as const,
      queryFn: ({ signal }) => getMembers(filters, signal),
    }),
  ownedAdmins: (ownerId: string) =>
    queryOptions({
      queryKey: [...systemQueries.all, 'owned-admins', ownerId] as const,
      queryFn: ({ signal }) => getOwnedAdmins(ownerId, signal),
    }),
  memberOptions: () =>
    queryOptions({
      queryKey: [...systemQueries.all, 'member-options'] as const,
      queryFn: ({ signal }) => getMemberOptions(signal),
    }),
  roleGroups: () =>
    queryOptions({
      queryKey: [...systemQueries.all, 'role-groups'] as const,
      queryFn: ({ signal }) => getRoleGroups(signal),
    }),
  audit: (filters: AuditFilters) =>
    queryOptions({
      queryKey: [...systemQueries.all, 'audit', filters] as const,
      queryFn: ({ signal }) => getAuditLogs(filters, signal),
    }),
  config: () =>
    queryOptions({
      queryKey: [...systemQueries.all, 'config'] as const,
      queryFn: ({ signal }) => getSystemConfig(signal),
    }),
  backups: () =>
    queryOptions({
      queryKey: [...systemQueries.all, 'backups'] as const,
      queryFn: ({ signal }) => getBackups(signal),
    }),
};
