import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { formatDateTimeInLocale } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';
import type { Alert, AlertListFilters } from '../schemas/alertSchemas';
import {
  AlertSeverityTag,
  AlertStatusTag,
  TicketStatusTag,
} from './AlertStatusTag';
import { AlertSlaCell } from './AlertSlaCell';

export function AlertTable({
  data,
  filters,
  now,
  canHandle,
  claimingId,
  onClaim,
  onOpen,
  onPageChange,
}: {
  data: PageResponse<Alert>;
  filters: AlertListFilters;
  now: number;
  canHandle: boolean;
  claimingId?: string;
  onClaim: (id: string) => void;
  onOpen: (id: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t, i18n } = useTranslation('alerts');
  const columns: ColumnsType<Alert> = [
    {
      title: t('table.name'),
      key: 'name',
      render: (_, alert) => (
        <div>
          <div className="font-medium">{alert.name}</div>
          {alert.occurrenceCount > 1 ? (
            <span className="text-xs text-brand-gray">
              {t('table.occurrences', { count: alert.occurrenceCount })}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t('table.severity'),
      dataIndex: 'severity',
      render: (value) => <AlertSeverityTag value={value} />,
    },
    { title: t('table.errorCode'), dataIndex: 'errorCode' },
    { title: t('table.deviceId'), dataIndex: 'deviceId' },
    { title: t('table.model'), dataIndex: 'modelName' },
    { title: t('table.region'), dataIndex: 'region' },
    {
      title: t('table.raisedAt'),
      dataIndex: 'raisedAt',
      render: (value) => (
        <span className="whitespace-nowrap">
          {formatDateTimeInLocale(value, i18n.resolvedLanguage)}
        </span>
      ),
    },
    {
      title: t('table.sla'),
      key: 'sla',
      render: (_, alert) => (
        <AlertSlaCell sla={alert.sla} raisedAt={alert.raisedAt} now={now} />
      ),
    },
    {
      title: t('table.status'),
      dataIndex: 'status',
      render: (value) => <AlertStatusTag value={value} />,
    },
    {
      title: t('table.handler'),
      key: 'handler',
      render: (_, alert) => alert.handler?.name ?? '—',
    },
    {
      title: t('table.ticket'),
      key: 'ticket',
      render: (_, alert) =>
        alert.ticket ? (
          <div className="space-y-1">
            <div className="font-mono text-xs">{alert.ticket.code}</div>
            <TicketStatusTag value={alert.ticket.status} />
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: t('table.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_, alert) =>
        canHandle && alert.status === 'new' ? (
          <Button
            type="link"
            loading={claimingId === alert.id}
            onClick={(event) => {
              event.stopPropagation();
              onClaim(alert.id);
            }}
          >
            {t('table.claim')}
          </Button>
        ) : null,
    },
  ];
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data.items}
      scroll={{ x: 'max-content' }}
      onRow={(alert) => ({
        onClick: () => onOpen(alert.id),
        className: 'cursor-pointer',
      })}
      pagination={{
        current: filters.page,
        pageSize: filters.pageSize,
        total: data.total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
        showTotal: (total) => t('table.total', { total }),
        onChange: onPageChange,
      }}
    />
  );
}
