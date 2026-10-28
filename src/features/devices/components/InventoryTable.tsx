import { WarningOutlined } from '@ant-design/icons';
import { Pagination, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { ConnectionStatusBadge } from '@/shared/components/ConnectionStatusBadge';
import { toneColors } from '@/shared/components/portal/tone';
import { formatDateTime } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import { stockAgeTone } from '../constants/inventory';
import type {
  InventoryDevice,
  InventoryListFilters,
} from '../schemas/inventorySchemas';
import { EntitlementTags } from './EntitlementTags';

const dayMs = 86_400_000;

function stockAgeDays(receivedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(receivedAt)) / dayMs));
}

function StockAge({ device }: { device: InventoryDevice }) {
  const { t } = useTranslation('devices');
  const days = stockAgeDays(device.receivedAt);
  const tone = stockAgeTone(days);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap"
      style={{
        backgroundColor: toneColors[tone].bg,
        color: toneColors[tone].fg,
      }}
    >
      {t('inventory.table.ageDays', { count: days })}
    </span>
  );
}

// Everything on this tab has never been activated (bound to a customer).
function NotActivatedTag() {
  const { t } = useTranslation('devices');
  return <Tag className="m-0">{t('inventory.table.notActivated')}</Tag>;
}

export interface InventoryTableProps {
  data: PageResponse<InventoryDevice>;
  filters: InventoryListFilters;
  loading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
}

export function InventoryTable({
  data,
  filters,
  loading = false,
  onPageChange,
}: InventoryTableProps) {
  const { t } = useTranslation('devices');

  const columns: ColumnsType<InventoryDevice> = [
    {
      title: t('inventory.table.columns.identity'),
      key: 'identity',
      render: (_: unknown, device) => (
        <div>
          <div className="text-[13px] font-semibold text-[#020204]">
            {device.id}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#636466]">
            {device.modelName}
            {device.connectivity === 'non_iot' ? (
              <ConnectionStatusBadge status={null} />
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: t('inventory.table.columns.status'),
      key: 'status',
      render: () => <NotActivatedTag />,
    },
    {
      title: t('inventory.table.columns.entitlements'),
      key: 'entitlements',
      render: (_: unknown, device) => (
        <EntitlementTags
          items={device.entitlementsSummary}
          variant="inventory"
        />
      ),
    },
    {
      title: t('inventory.table.columns.firmware'),
      key: 'firmware',
      render: (_: unknown, device) =>
        device.connectivity === 'non_iot' ? (
          <span className="text-xs text-[#9A9B9C]">—</span>
        ) : (
          <div className="space-y-1 text-xs text-[#636466]">
            <div>
              {t('history.module')}{' '}
              <span className="rounded-md bg-[#F3F4F4] px-1.5 py-0.5 font-mono text-[#020204]">
                {device.moduleFirmwareVersion}
              </span>
            </div>
            <div>
              {t('history.mainboard')}{' '}
              <span className="rounded-md bg-[#F3F4F4] px-1.5 py-0.5 font-mono text-[#020204]">
                {device.mainboardFirmwareVersion}
              </span>
            </div>
            {device.firmwareOutdated ? (
              <Tooltip title={t('inventory.table.firmwareOutdatedHint')}>
                <Tag color="warning" icon={<WarningOutlined />} className="m-0">
                  {t('inventory.table.firmwareOutdated')}
                </Tag>
              </Tooltip>
            ) : null}
          </div>
        ),
    },
    {
      title: t('inventory.table.columns.age'),
      key: 'age',
      render: (_: unknown, device) => (
        <div className="space-y-1">
          <StockAge device={device} />
          <div className="whitespace-nowrap text-xs text-[#636466]">
            {t('inventory.table.receivedAt', {
              date: formatDateTime(device.receivedAt),
            })}
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="hidden pb-2 lg:block">
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => t('inventory.table.total', { total }),
            onChange: onPageChange,
          }}
        />
      </div>
      <div className="lg:hidden">
        <div
          aria-busy={loading}
          className={`divide-y divide-[#E7E8E9] transition-opacity ${
            loading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {data.items.map((device) => (
            <div key={device.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Typography.Text strong>{device.id}</Typography.Text>
                  <div className="mt-1 text-sm text-[#636466]">
                    {device.modelName}
                  </div>
                </div>
                <NotActivatedTag />
              </div>
              {device.entitlementsSummary.length > 0 ? (
                <EntitlementTags
                  items={device.entitlementsSummary}
                  variant="inventory"
                />
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E8E9] pt-3">
                <span className="text-xs text-[#636466]">
                  {t('inventory.table.receivedAt', {
                    date: formatDateTime(device.receivedAt),
                  })}
                </span>
                <StockAge device={device} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center border-t border-[#E7E8E9] p-4">
          <Pagination
            simple
            current={filters.page}
            pageSize={filters.pageSize}
            total={data.total}
            showSizeChanger={false}
            onChange={onPageChange}
          />
        </div>
      </div>
    </>
  );
}
