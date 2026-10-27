import { useQuery } from '@tanstack/react-query';
import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';

import { DISTRIBUTION_REGION_LABEL_KEYS } from '@/shared/constants/distributionRegion';

import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import type { SerialBatch } from '../schemas/serialSchemas';

export interface SerialBatchTableProps {
  batches: SerialBatch[];
  onRecall: (batch: SerialBatch) => void;
}

export function SerialBatchTable({ batches, onRecall }: SerialBatchTableProps) {
  const { t, i18n } = useTranslation('serials');
  const config = useQuery(coreLifecycleQueries.detail());
  const coreName = (code: string) =>
    config.data?.coreTypes.find((core) => core.code === code)?.name ?? code;

  const columns: ColumnsType<SerialBatch> = [
    {
      title: t('batchTable.columns.batch'),
      key: 'batch',
      render: (_: unknown, row: SerialBatch) => (
        <div>
          <div className="font-mono text-[13px] font-semibold">{row.id}</div>
          <div className="mt-1 text-xs text-[#636466]">
            {coreName(row.coreType)} ·{' '}
            {row.region
              ? t(DISTRIBUTION_REGION_LABEL_KEYS[row.region], { ns: 'common' })
              : t('batchLifespan.regionUndeclared')}
          </div>
        </div>
      ),
    },
    {
      title: t('batchTable.columns.volume'),
      key: 'volume',
      render: (_: unknown, row: SerialBatch) =>
        t('batchTable.volumeValue', { used: row.used, total: row.total }),
    },
    {
      title: t('batchTable.columns.ingestedAt'),
      key: 'ingestedAt',
      render: (_: unknown, row: SerialBatch) =>
        formatDateTime(row.ingestedAt, i18n.resolvedLanguage),
    },
    {
      title: t('batchTable.columns.state'),
      key: 'state',
      render: (_: unknown, row: SerialBatch) =>
        row.recalledAt ? (
          <div className="space-y-1">
            <Tag color="error">{t('batchTable.recalled')}</Tag>
            <div className="text-xs text-[#636466]">{row.recallReason}</div>
          </div>
        ) : (
          <Tag color="success">{t('batchTable.active')}</Tag>
        ),
    },
    {
      title: t('table.columns.actions'),
      key: 'actions',
      render: (_: unknown, row: SerialBatch) => (
        <PermissionGuard capability="serial.write">
          <Button
            danger
            type="link"
            size="small"
            disabled={Boolean(row.recalledAt)}
            onClick={() => onRecall(row)}
          >
            {t('batchTable.recall')}
          </Button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={batches}
      pagination={false}
    />
  );
}
