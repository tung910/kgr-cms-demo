import { Pagination, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { StatusTag } from '@/shared/components/StatusTag';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import type { Serial, SerialListFilters } from '../schemas/serialSchemas';

const statusTone: Record<Serial['status'], string> = {
  unused: 'active',
  used: 'inactive',
  recalled: 'error',
};

export interface SerialTableProps {
  data: PageResponse<Serial>;
  filters: SerialListFilters;
  onPageChange: (page: number, pageSize: number) => void;
}

export function SerialTable({ data, filters, onPageChange }: SerialTableProps) {
  const { t, i18n } = useTranslation('serials');

  const columns: ColumnsType<Serial> = [
    {
      title: t('table.columns.serial'),
      key: 'serial',
      render: (_: unknown, row: Serial) => (
        <div>
          <div className="font-mono text-[13px] font-semibold">
            {row.serial}
          </div>
          <div className="mt-1 text-xs text-[#636466]">{row.modelCode}</div>
        </div>
      ),
    },
    {
      title: t('table.columns.key'),
      key: 'maskedKey',
      render: (_: unknown, row: Serial) => (
        <Tooltip title={t('table.keyMaskedHint')}>
          <span className="font-mono text-xs">{row.maskedKey}</span>
        </Tooltip>
      ),
    },
    { title: t('table.columns.batch'), dataIndex: 'batchId', key: 'batchId' },
    {
      title: t('table.columns.status'),
      key: 'status',
      render: (_: unknown, row: Serial) => (
        <StatusTag
          status={statusTone[row.status]}
          label={t(`status.${row.status}`)}
        />
      ),
    },
    {
      title: t('table.columns.usedAt'),
      key: 'usedAt',
      render: (_: unknown, row: Serial) =>
        row.usedAt ? (
          <div className="text-xs">
            <div>{formatDateTime(row.usedAt, i18n.resolvedLanguage)}</div>
            <div className="text-[#636466]">{row.usedByDeviceId}</div>
          </div>
        ) : (
          <span className="text-xs text-[#636466]">{t('table.notUsed')}</span>
        ),
    },
  ];

  return (
    <>
      <Table
        rowKey="serial"
        size="small"
        columns={columns}
        dataSource={data.items}
        pagination={false}
      />
      <div className="flex justify-end p-4">
        <Pagination
          showSizeChanger
          current={filters.page}
          pageSize={filters.pageSize}
          total={data.total}
          pageSizeOptions={[10, 20, 50]}
          onChange={onPageChange}
        />
      </div>
    </>
  );
}
