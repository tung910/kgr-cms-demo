import { useState } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Select, Table, Tabs, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalCard } from '@/shared/components/portal';

import type {
  CoreLifecycleConfig,
  CoreType,
} from '../schemas/coreLifecycleSchemas';
import {
  BATCH_LIFESPAN_STATUSES,
  type BatchLifespanStatus,
  type SerialBatch,
} from '../schemas/serialSchemas';
import {
  CORE_CRITICAL_PERCENT,
  CORE_WARNING_PERCENT,
  lifespanFloor,
} from '../utils/coreLifespan';
import { BatchLifespanModal } from './BatchLifespanModal';
import { BatchLifespanTable } from './BatchLifespanTable';
import { BatchRegionModal } from './BatchRegionModal';
import { CoreAuditTable } from './CoreAuditTable';
import { CoreTypeModal } from './CoreTypeModal';
import { LifespanText } from './LifespanText';
import { ThresholdTags } from './ThresholdTags';
import { SerialIngestModal } from './SerialIngestModal';

export interface CoreLifecycleFilters {
  lifespanStatus?: BatchLifespanStatus;
  coreType?: string;
}

export interface CoreLifecyclePanelProps {
  config: CoreLifecycleConfig;
  batches: SerialBatch[];
  filters: CoreLifecycleFilters;
  onFiltersChange: (changes: CoreLifecycleFilters) => void;
}

export function CoreLifecyclePanel({
  config,
  batches,
  filters,
  onFiltersChange,
}: CoreLifecyclePanelProps) {
  const { t, i18n } = useTranslation('serials');
  const { session } = useAuth();
  const canReadCoreTypes =
    !!session && hasCapability(session.role, 'core_type.read');
  const canUpdateCoreTypes =
    !!session && hasCapability(session.role, 'core_type.update');
  const [regionTarget, setRegionTarget] = useState<SerialBatch>();
  const [lifespanTarget, setLifespanTarget] = useState<SerialBatch>();
  const [editingCore, setEditingCore] = useState<CoreType>();
  const [ingestOpen, setIngestOpen] = useState(false);

  const visibleBatches = batches.filter(
    (batch) =>
      (!filters.lifespanStatus ||
        batch.lifespanStatus === filters.lifespanStatus) &&
      (!filters.coreType || batch.coreType === filters.coreType)
  );
  const pendingCount = batches.filter(
    (batch) => batch.lifespanStatus === 'pending' && !batch.recalledAt
  ).length;
  const coreOptions = config.coreTypes.map((core) => ({
    value: core.code,
    label: core.name,
  }));

  const batchesTab = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select<BatchLifespanStatus | 'all'>
          aria-label={t('batchLifespan.filters.status')}
          className="w-full sm:w-48"
          value={filters.lifespanStatus ?? 'all'}
          options={[
            { value: 'all', label: t('batchLifespan.filters.allStatuses') },
            ...BATCH_LIFESPAN_STATUSES.map((status) => ({
              value: status.value,
              label: t(status.labelKey),
            })),
          ]}
          onChange={(value) =>
            onFiltersChange({
              lifespanStatus: value === 'all' ? undefined : value,
            })
          }
        />
        <Select
          allowClear
          aria-label={t('batchLifespan.filters.coreType')}
          placeholder={t('batchLifespan.filters.allCoreTypes')}
          className="w-full sm:w-56"
          value={filters.coreType}
          options={coreOptions}
          onChange={(coreType?: string) => onFiltersChange({ coreType })}
        />
        <span className="hidden flex-1 sm:block" />
        <PermissionGuard capability="serial.write">
          <Button type="primary" onClick={() => setIngestOpen(true)}>
            {t('listPage.ingest')}
          </Button>
        </PermissionGuard>
      </div>
      {pendingCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={t('batchLifespan.pendingNotice', { count: pendingCount })}
        />
      ) : null}
      <BatchLifespanTable
        batches={visibleBatches}
        coreTypes={config.coreTypes}
        onDeclareRegion={setRegionTarget}
        onEditLifespan={setLifespanTarget}
      />
    </div>
  );

  const coreTypesTab = (
    <div className="space-y-3">
      <Alert
        type="info"
        showIcon
        title={
          <ul className="m-0 space-y-1 pl-4">
            <li>{t('coreTypes.sourceNote')}</li>
            <li>
              {t('coreTypes.thresholdNote', {
                warning: CORE_WARNING_PERCENT,
                critical: CORE_CRITICAL_PERCENT,
              })}
            </li>
            <li>{t('coreTypes.floorNote')}</li>
          </ul>
        }
      />
      <Table<CoreType>
        rowKey="code"
        size="small"
        pagination={false}
        scroll={{ x: true }}
        dataSource={config.coreTypes}
        columns={[
          {
            title: t('coreTypes.columns.code'),
            key: 'code',
            render: (_, row) => <b>{row.code}</b>,
          },
          { title: t('coreTypes.columns.name'), dataIndex: 'name' },
          { title: t('coreTypes.columns.group'), dataIndex: 'group' },
          {
            title: t('coreTypes.columns.position'),
            dataIndex: 'usualPosition',
          },
          {
            title: t('coreTypes.columns.standard'),
            key: 'standard',
            render: (_, row) => (
              <LifespanText
                months={row.standardMonths}
                hours={row.standardHours}
              />
            ),
          },
          {
            title: t('coreTypes.columns.thresholds'),
            key: 'thresholds',
            render: (_, row) => (
              <ThresholdTags
                lifespan={{
                  months: row.standardMonths,
                  hours: row.standardHours,
                }}
              />
            ),
          },
          {
            title: (
              <Tooltip title={t('coreTypes.floorTooltip')}>
                <span className="inline-flex items-center gap-1">
                  {t('coreTypes.columns.floor')} <InfoCircleOutlined />
                </span>
              </Tooltip>
            ),
            key: 'floor',
            render: (_, row) => (
              <div>
                <div>{row.floorPercent}%</div>
                <div className="text-xs text-[#636466]">
                  {t('coreTypes.floorMin', {
                    months: lifespanFloor(row.standardMonths, row.floorPercent),
                    hours: new Intl.NumberFormat(i18n.resolvedLanguage).format(
                      lifespanFloor(row.standardHours, row.floorPercent)
                    ),
                  })}
                </div>
              </div>
            ),
          },
          {
            title: t('coreTypes.columns.batches'),
            key: 'batches',
            render: (_, row) => {
              const ofCore = batches.filter(
                (batch) => batch.coreType === row.code
              );
              return (
                <div>
                  <div>{ofCore.length}</div>
                  <div className="text-xs text-[#636466]">
                    {t('coreTypes.pendingCount', {
                      count: ofCore.filter(
                        (batch) =>
                          batch.lifespanStatus === 'pending' &&
                          !batch.recalledAt
                      ).length,
                    })}
                  </div>
                </div>
              );
            },
          },
          ...(canUpdateCoreTypes
            ? [
                {
                  title: t('table.columns.actions'),
                  key: 'actions',
                  render: (_: unknown, row: CoreType) => (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setEditingCore(row)}
                    >
                      {t('coreTypes.edit')}
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );

  return (
    <PortalCard>
      <Tabs
        items={[
          {
            key: 'batches',
            label: t('coreLifecycle.tabs.batches'),
            children: batchesTab,
          },
          ...(canReadCoreTypes
            ? [
                {
                  key: 'coreTypes',
                  label: t('coreLifecycle.tabs.coreTypes'),
                  children: coreTypesTab,
                },
                {
                  key: 'audit',
                  label: t('coreLifecycle.tabs.audit'),
                  children: (
                    <CoreAuditTable
                      entries={config.auditLog}
                      coreTypes={config.coreTypes}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
      <BatchRegionModal
        batch={regionTarget}
        onClose={() => setRegionTarget(undefined)}
      />
      <BatchLifespanModal
        batch={lifespanTarget}
        batches={batches}
        coreTypes={config.coreTypes}
        regionInsights={config.regionInsights}
        onClose={() => setLifespanTarget(undefined)}
      />
      <CoreTypeModal
        core={editingCore}
        batches={batches}
        onClose={() => setEditingCore(undefined)}
      />
      <SerialIngestModal
        open={ingestOpen}
        onClose={() => setIngestOpen(false)}
      />
    </PortalCard>
  );
}
