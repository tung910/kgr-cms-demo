import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PortalProgress } from '@/shared/components/portal';
import {
  DISTRIBUTION_REGION_LABEL_KEYS,
  DISTRIBUTION_REGIONS,
} from '@/shared/constants/distributionRegion';
import { formatDate } from '@/shared/lib/format';

import type { CoreType } from '../schemas/coreLifecycleSchemas';
import type { SerialBatch } from '../schemas/serialSchemas';
import { effectiveBatchLifespan, lifespanPercent } from '../utils/coreLifespan';
import { LifespanText } from './LifespanText';

export interface BatchLifespanTableProps {
  batches: SerialBatch[];
  coreTypes: CoreType[];
  onDeclareRegion: (batch: SerialBatch) => void;
  onEditLifespan: (batch: SerialBatch) => void;
}

export function BatchLifespanTable({
  batches,
  coreTypes,
  onDeclareRegion,
  onEditLifespan,
}: BatchLifespanTableProps) {
  const { t } = useTranslation('serials');
  const { session } = useAuth();
  const canDeclareRegion =
    !!session && hasCapability(session.role, 'serial.batch.region');
  const canEditLifespan =
    !!session && hasCapability(session.role, 'serial.batch.lifespan');
  const coreOf = (code: string) => coreTypes.find((core) => core.code === code);

  const renderAction = (row: SerialBatch) => {
    if (row.recalledAt) return <span className="text-[#636466]">—</span>;
    if (!row.region) {
      if (canDeclareRegion)
        return (
          <Button type="link" size="small" onClick={() => onDeclareRegion(row)}>
            {t('batchLifespan.declareRegion')}
          </Button>
        );
      if (canEditLifespan)
        return (
          <span className="text-xs text-[#636466]">
            {t('batchLifespan.awaitingRegion')}
          </span>
        );
      return <span className="text-[#636466]">—</span>;
    }
    if (!canEditLifespan) return <span className="text-[#636466]">—</span>;
    return (
      <Button type="link" size="small" onClick={() => onEditLifespan(row)}>
        {row.lifespanStatus === 'pending'
          ? t('batchLifespan.confirm')
          : t('batchLifespan.adjust')}
      </Button>
    );
  };

  const columns: ColumnsType<SerialBatch> = [
    {
      title: t('batchLifespan.columns.batch'),
      key: 'batch',
      render: (_, row) => (
        <div>
          <div className="font-mono text-[13px] font-semibold">{row.id}</div>
          <div className="mt-1 text-xs text-[#636466]">
            {t('batchLifespan.ingestedOn', {
              date: formatDate(row.ingestedAt),
            })}
          </div>
        </div>
      ),
    },
    {
      title: t('batchLifespan.columns.coreType'),
      key: 'coreType',
      render: (_, row) => coreOf(row.coreType)?.name ?? row.coreType,
    },
    {
      title: t('batchLifespan.columns.region'),
      key: 'region',
      render: (_, row) => {
        if (!row.region)
          return <Tag>{t('batchLifespan.regionUndeclared')}</Tag>;
        const group = DISTRIBUTION_REGIONS.find(
          (item) => item.value === row.region
        )?.group;
        return (
          <div>
            <div>
              {t(DISTRIBUTION_REGION_LABEL_KEYS[row.region], { ns: 'common' })}
            </div>
            {group ? (
              <div className="text-xs text-[#636466]">
                {t(`distributionRegionGroup.${group}`, { ns: 'common' })}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: t('batchLifespan.columns.activation'),
      key: 'activation',
      render: (_, row) => (
        <div className="min-w-24">
          <div className="text-sm">
            {t('batchTable.volumeValue', { used: row.used, total: row.total })}
          </div>
          <PortalProgress value={row.used} max={row.total} className="mt-1" />
        </div>
      ),
    },
    {
      title: t('batchLifespan.columns.lifespan'),
      key: 'lifespan',
      render: (_, row) => {
        const core = coreOf(row.coreType);
        if (!core) return '—';
        const lifespan = effectiveBatchLifespan(row, core);
        return (
          <div>
            <LifespanText months={lifespan.months} hours={lifespan.hours} />
            {lifespan.source === 'standard' ? (
              <div className="text-xs text-[#636466]">
                {t('batchLifespan.followsStandard')}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: t('batchLifespan.columns.vsStandard'),
      key: 'vsStandard',
      render: (_, row) => {
        const core = coreOf(row.coreType);
        if (!core) return '—';
        const percent = lifespanPercent(
          effectiveBatchLifespan(row, core).hours,
          core.standardHours
        );
        return percent < 100 ? (
          <Tag color="orange">{percent}%</Tag>
        ) : (
          <span className="text-[#636466]">100%</span>
        );
      },
    },
    {
      title: t('batchLifespan.columns.status'),
      key: 'status',
      render: (_, row) =>
        row.recalledAt ? (
          <Tag color="error">{t('batchTable.recalled')}</Tag>
        ) : row.lifespanStatus === 'confirmed' ? (
          <Tag color="success">{t('lifespanStatus.confirmed')}</Tag>
        ) : (
          <Tag color="warning">{t('lifespanStatus.pending')}</Tag>
        ),
    },
    {
      title: t('table.columns.actions'),
      key: 'actions',
      render: (_, row) => renderAction(row),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={batches}
      pagination={false}
      scroll={{ x: true }}
      locale={{ emptyText: t('batchLifespan.empty') }}
    />
  );
}
