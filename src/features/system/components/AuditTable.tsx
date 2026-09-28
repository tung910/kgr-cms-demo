import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { formatDateTimeInLocale } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import type { AuditEntry, AuditFilters } from '../schemas/systemSchemas';

const AUDIT_PAGE_SIZES = [10, 25, 50, 100] as const;

export interface AuditTableProps {
  data: PageResponse<AuditEntry>;
  filters: AuditFilters;
  onPageChange: (page: number, pageSize: number) => void;
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-xs font-semibold text-[#636466]">{label}</div>
      <pre className="m-0 max-h-60 overflow-auto rounded bg-[#F4F4F4] p-2 text-xs">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}

export function AuditTable({ data, filters, onPageChange }: AuditTableProps) {
  const { t, i18n } = useTranslation('system');

  const columns: ColumnsType<AuditEntry> = [
    {
      title: t('audit.table.columns.time'),
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      render: (value: string) => formatDateTimeInLocale(value, i18n.language),
    },
    {
      title: t('audit.table.columns.actor'),
      dataIndex: 'actorName',
      key: 'actorName',
    },
    {
      title: t('audit.table.columns.ip'),
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string) => <span className="font-mono text-xs">{ip}</span>,
    },
    {
      title: t('audit.table.columns.module'),
      dataIndex: 'module',
      key: 'module',
      render: (value: string) =>
        t(`audit.modules.${value}`, { defaultValue: value }),
    },
    {
      title: t('audit.table.columns.action'),
      dataIndex: 'action',
      key: 'action',
      render: (value: string) =>
        t(`audit.actions.${value}`, { defaultValue: value }),
    },
    {
      title: t('audit.table.columns.target'),
      dataIndex: 'target',
      key: 'target',
    },
  ];

  return (
    <Table<AuditEntry>
      rowKey="id"
      columns={columns}
      dataSource={data.items}
      scroll={{ x: 'max-content' }}
      expandable={{
        // Before/after values and the reason live in the expanded row.
        rowExpandable: (entry) =>
          entry.before !== null ||
          entry.after !== null ||
          entry.reason !== null,
        expandedRowRender: (entry) => (
          <div className="space-y-3">
            {entry.reason ? (
              <div className="text-sm">
                <span className="font-semibold">
                  {t('audit.table.reason')}:{' '}
                </span>
                {entry.reason}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <JsonBlock label={t('audit.table.before')} value={entry.before} />
              <JsonBlock label={t('audit.table.after')} value={entry.after} />
            </div>
          </div>
        ),
      }}
      pagination={{
        current: filters.page,
        pageSize: filters.pageSize,
        total: data.total,
        showSizeChanger: true,
        pageSizeOptions: [...AUDIT_PAGE_SIZES],
        onChange: onPageChange,
      }}
    />
  );
}
