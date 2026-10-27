import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  DISTRIBUTION_REGION_LABEL_KEYS,
  DISTRIBUTION_REGION_VALUES,
  type DistributionRegion,
} from '@/shared/constants/distributionRegion';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';

import type {
  CoreLifecycleAuditEntry,
  CoreType,
} from '../schemas/coreLifecycleSchemas';

const isRegion = (value: string): value is DistributionRegion =>
  (DISTRIBUTION_REGION_VALUES as readonly string[]).includes(value);

// Region and status values are stored as codes; translate them here.
function auditValue(t: TFunction, field: string, value: string) {
  if (!value) return '—';
  if (field === 'region' && isRegion(value))
    return t(DISTRIBUTION_REGION_LABEL_KEYS[value], { ns: 'common' });
  if (field === 'lifespanStatus') return t(`lifespanStatus.${value}`);
  return value;
}

export interface CoreAuditTableProps {
  entries: CoreLifecycleAuditEntry[];
  coreTypes: CoreType[];
}

export function CoreAuditTable({ entries, coreTypes }: CoreAuditTableProps) {
  const { t, i18n } = useTranslation('serials');
  const coreName = (code: string) =>
    coreTypes.find((core) => core.code === code)?.name ?? code;

  const columns: ColumnsType<CoreLifecycleAuditEntry> = [
    {
      title: t('coreAudit.columns.changedAt'),
      key: 'changedAt',
      render: (_, row) => formatDateTime(row.changedAt, i18n.resolvedLanguage),
    },
    { title: t('coreAudit.columns.actor'), dataIndex: 'actor', key: 'actor' },
    {
      title: t('coreAudit.columns.target'),
      key: 'target',
      render: (_, row) =>
        row.targetKind === 'batch'
          ? t('coreAudit.targetBatch', { code: row.target })
          : t('coreAudit.targetCoreType', { name: coreName(row.target) }),
    },
    {
      title: t('coreAudit.columns.field'),
      key: 'field',
      render: (_, row) => t(`coreAudit.fields.${row.field}`),
    },
    {
      title: t('coreAudit.columns.before'),
      key: 'before',
      render: (_, row) => auditValue(t, row.field, row.beforeValue),
    },
    {
      title: t('coreAudit.columns.after'),
      key: 'after',
      render: (_, row) => <b>{auditValue(t, row.field, row.afterValue)}</b>,
    },
    {
      title: t('coreAudit.columns.reason'),
      key: 'reason',
      render: (_, row) => row.reason || '—',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="m-0 text-sm text-[#636466]">
        {t('coreAudit.readOnlyNote')}
      </p>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={entries}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: true }}
        locale={{ emptyText: t('coreAudit.empty') }}
      />
    </div>
  );
}
