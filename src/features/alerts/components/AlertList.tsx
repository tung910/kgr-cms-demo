import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { PageState } from '@/shared/components/PageState';
import { formatDateTime } from '@/shared/lib/format';

import type { Alert, AlertSeverity } from '../mocks/alertMockData';

const severityColors: Record<AlertSeverity, string> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

const statusColors: Record<Alert['status'], string> = {
  new: 'processing',
  assigned: 'warning',
  resolved: 'success',
};

export interface AlertListProps {
  alerts: Alert[];
  onAssign: (id: string) => void;
  onResolve: (id: string) => void;
}

export function AlertList({ alerts, onAssign, onResolve }: AlertListProps) {
  const { t } = useTranslation('alerts');

  if (alerts.length === 0) {
    return <PageState kind="empty" description={t('list.empty')} />;
  }

  const columns: ColumnsType<Alert> = [
    {
      title: t('list.columns.identity'),
      key: 'identity',
      render: (_: unknown, alert: Alert) => (
        <div>
          <div className="font-mono text-[13px] font-semibold">
            {alert.errorCode}
          </div>
          <div className="mt-1 text-xs text-[#636466]">{alert.deviceId}</div>
        </div>
      ),
    },
    { title: t('list.columns.message'), dataIndex: 'message', key: 'message' },
    {
      title: t('list.columns.severity'),
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: AlertSeverity) => (
        <Tag color={severityColors[severity]}>{t(`severity.${severity}`)}</Tag>
      ),
    },
    {
      title: t('list.columns.status'),
      key: 'status',
      render: (_: unknown, alert: Alert) => (
        <div className="space-y-1">
          <Tag color={statusColors[alert.status]}>
            {t(`status.${alert.status}`)}
          </Tag>
          {alert.assignee ? (
            <div className="text-xs text-[#636466]">
              {t('list.assignee', { name: alert.assignee })}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: t('list.columns.raisedAt'),
      dataIndex: 'raisedAt',
      key: 'raisedAt',
      render: formatDateTime,
    },
    {
      title: t('list.columns.actions'),
      key: 'actions',
      fixed: 'right',
      render: (_: unknown, alert: Alert) => (
        <div className="flex flex-wrap gap-2">
          {alert.status === 'new' ? (
            <Button type="link" onClick={() => onAssign(alert.id)}>
              {t('list.assign')}
            </Button>
          ) : null}
          {alert.status !== 'resolved' ? (
            <Button type="link" onClick={() => onResolve(alert.id)}>
              {t('list.resolve')}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 pb-2">
      <Table
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={alerts}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />
    </div>
  );
}
