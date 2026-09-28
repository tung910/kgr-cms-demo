import { Button, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { StatusTag } from '@/shared/components/StatusTag';
import { formatDateTimeInLocale } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import type { Member, MemberListFilters } from '../schemas/systemSchemas';
import type { MemberReasonAction } from '../api/systemApi';

const MEMBER_PAGE_SIZES = [10, 25, 50, 100] as const;

export interface MemberTableProps {
  data: PageResponse<Member>;
  filters: MemberListFilters;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (member: Member) => void;
  onReasonAction: (member: Member, action: MemberReasonAction) => void;
}

export function MemberTable({
  data,
  filters,
  onPageChange,
  onEdit,
  onReasonAction,
}: MemberTableProps) {
  const { t, i18n } = useTranslation('system');
  const { session } = useAuth();
  const can = (capability: Parameters<typeof hasCapability>[1]) =>
    !!session && hasCapability(session.role, capability);
  const canUpdate = can('member.update');
  const canDelete = can('member.delete');

  // Buttons are hidden without the capability; when the capability is held but
  // the row outranks the caller they stay visible and disabled (no escalation).
  const guarded = (member: Member, button: React.ReactElement) =>
    member.manageable ? (
      button
    ) : (
      <Tooltip title={t('members.table.notManageable')}>
        <span>{button}</span>
      </Tooltip>
    );

  const columns: ColumnsType<Member> = [
    {
      title: t('members.table.columns.name'),
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: t('members.table.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => <span className="font-mono">{phone}</span>,
    },
    {
      title: t('members.table.columns.role'),
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: t('members.table.columns.lastAccess'),
      dataIndex: 'lastAccessAt',
      key: 'lastAccessAt',
      render: (value: string | null) =>
        formatDateTimeInLocale(value, i18n.language),
    },
    {
      title: t('members.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: Member['status'], member) => (
        <Tooltip title={member.lockedReason}>
          <span>
            <StatusTag
              status={status === 'active' ? 'active' : 'error'}
              label={t(`members.status.${status}`)}
            />
          </span>
        </Tooltip>
      ),
    },
  ];

  if (canUpdate || canDelete) {
    columns.push({
      title: t('members.table.columns.actions'),
      key: 'actions',
      render: (_: unknown, member) => (
        <div className="flex flex-wrap gap-1">
          {canUpdate
            ? guarded(
                member,
                <Button
                  size="small"
                  disabled={!member.manageable}
                  onClick={() => onEdit(member)}
                >
                  {t('members.actions.edit')}
                </Button>
              )
            : null}
          {canUpdate
            ? guarded(
                member,
                <Button
                  size="small"
                  disabled={!member.manageable}
                  onClick={() =>
                    onReasonAction(
                      member,
                      member.status === 'active' ? 'lock' : 'unlock'
                    )
                  }
                >
                  {member.status === 'active'
                    ? t('members.actions.lock')
                    : t('members.actions.unlock')}
                </Button>
              )
            : null}
          {canUpdate && member.status !== 'disabled'
            ? guarded(
                member,
                <Button
                  size="small"
                  danger
                  disabled={!member.manageable}
                  onClick={() => onReasonAction(member, 'disable')}
                >
                  {t('members.actions.disable')}
                </Button>
              )
            : null}
          {canUpdate && member.transferable ? (
            <Button
              size="small"
              onClick={() => onReasonAction(member, 'transfer')}
            >
              {t('members.actions.transfer')}
            </Button>
          ) : null}
          {canDelete && member.level !== 'system_admin'
            ? guarded(
                member,
                <Button
                  size="small"
                  danger
                  disabled={!member.manageable}
                  onClick={() => onReasonAction(member, 'delete')}
                >
                  {t('members.actions.delete')}
                </Button>
              )
            : null}
        </div>
      ),
    });
  }

  return (
    <Table<Member>
      rowKey="id"
      columns={columns}
      dataSource={data.items}
      scroll={{ x: 'max-content' }}
      pagination={{
        current: filters.page,
        pageSize: filters.pageSize,
        total: data.total,
        showSizeChanger: true,
        pageSizeOptions: [...MEMBER_PAGE_SIZES],
        onChange: onPageChange,
      }}
    />
  );
}
