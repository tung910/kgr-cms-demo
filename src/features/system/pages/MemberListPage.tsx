import { useDeferredValue, useState } from 'react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Button, Input, Select } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { PortalRole } from '@/core/auth/types';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PageState } from '@/shared/components/PageState';
import { PortalCard, PortalPageHeader } from '@/shared/components/portal';

import type { MemberReasonAction } from '../api/systemApi';
import { MemberFormModal } from '../components/MemberFormModal';
import {
  MemberReasonModal,
  type MemberReasonTarget,
} from '../components/MemberReasonModal';
import { MemberTable } from '../components/MemberTable';
import { systemQueries } from '../queries/systemQueries';
import type { Member, MemberListFilters } from '../schemas/systemSchemas';

export interface MemberListPageProps {
  filters: MemberListFilters;
}

export function MemberListPage({ filters }: MemberListPageProps) {
  const { t } = useTranslation('system');
  const navigate = useNavigate({ from: '/system/members' });
  const { data } = useSuspenseQuery(
    systemQueries.members(useDeferredValue(filters))
  );
  // Role filter options; only readable with role.read, so failure is ignored.
  const groups = useQuery(systemQueries.roleGroups());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member>();
  const [reasonTarget, setReasonTarget] = useState<MemberReasonTarget>();

  const updateFilters = (changes: Partial<MemberListFilters>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });
  };
  const openReason = (member: Member, action: MemberReasonAction) =>
    setReasonTarget({ member, action });
  const hasFilters = Boolean(filters.search || filters.roleId);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('members.title')}
        description={t('members.description')}
        actions={
          <PermissionGuard capability="member.create">
            <Button
              type="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              {t('members.add')}
            </Button>
          </PermissionGuard>
        }
      />
      <PortalCard padded={false}>
        <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
          <Input.Search
            key={filters.search}
            allowClear
            aria-label={t('members.filters.searchAriaLabel')}
            defaultValue={filters.search}
            placeholder={t('members.filters.searchPlaceholder')}
            className="w-full sm:min-w-56 sm:flex-1"
            onSearch={(search) => updateFilters({ search })}
          />
          {groups.data ? (
            <Select<PortalRole>
              allowClear
              aria-label={t('members.filters.roleAriaLabel')}
              placeholder={t('members.filters.rolePlaceholder')}
              value={filters.roleId}
              className="w-full sm:w-56"
              options={groups.data.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
              onChange={(roleId) => updateFilters({ roleId })}
            />
          ) : null}
          {hasFilters ? (
            <Button
              onClick={() =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    roleId: undefined,
                    search: '',
                    page: 1,
                  }),
                })
              }
            >
              {t('members.filters.reset')}
            </Button>
          ) : null}
        </div>
        {data.items.length === 0 ? (
          <PageState
            kind="empty"
            description={
              hasFilters ? t('members.emptyFiltered') : t('members.empty')
            }
          />
        ) : (
          <MemberTable
            data={data}
            filters={filters}
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
            onEdit={(member) => {
              setEditing(member);
              setFormOpen(true);
            }}
            onReasonAction={openReason}
          />
        )}
      </PortalCard>
      <MemberFormModal
        open={formOpen}
        member={editing}
        onClose={() => setFormOpen(false)}
      />
      <MemberReasonModal
        target={reasonTarget}
        onClose={() => setReasonTarget(undefined)}
      />
    </div>
  );
}
