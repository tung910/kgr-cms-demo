import { EnvironmentOutlined } from '@ant-design/icons';
import { Button, Pagination, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import {
  PortalBadge,
  PortalProgress,
  type PortalTone,
} from '@/shared/components/portal';
import { formatDate } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import { WARRANTY_STATUS_TONES } from '../constants/warranty';
import type {
  NonIotDevice,
  NonIotDeviceListFilters,
} from '../schemas/nonIotDeviceSchemas';

function filterLifeTone(percent: number): PortalTone {
  if (percent <= 20) return 'danger';
  if (percent <= 40) return 'warning';
  return 'primary';
}

export function NonIotWarrantyCell({ device }: { device: NonIotDevice }) {
  const { t } = useTranslation('devices');
  return (
    <div className="space-y-1">
      <PortalBadge tone={WARRANTY_STATUS_TONES[device.warrantyStatus]}>
        {t('warrantyStatus.' + device.warrantyStatus)}
      </PortalBadge>
      {device.warrantyExpiresAt ? (
        <div className="whitespace-nowrap text-xs text-[#636466]">
          {t(
            device.warrantyStatus === 'expired'
              ? 'detailPage.warrantyExpiredOn'
              : 'nonIot.table.warrantyUntil',
            { date: formatDate(device.warrantyExpiresAt) }
          )}
        </div>
      ) : null}
    </div>
  );
}

export function NonIotFilterLife({ device }: { device: NonIotDevice }) {
  const { t } = useTranslation('devices');
  const percent = device.filterLifePercent;
  return (
    <div className="min-w-44 space-y-1">
      <div className="text-right text-xs font-semibold tabular-nums">
        {percent}%
      </div>
      <PortalProgress
        value={percent}
        max={100}
        tone={filterLifeTone(percent)}
      />
      <div className="text-[11px] text-[#9A9B9C]">
        {t('nonIot.table.filterLifeEstimated')}
      </div>
    </div>
  );
}

export interface NonIotDeviceTableProps {
  data: PageResponse<NonIotDevice>;
  filters: NonIotDeviceListFilters;
  loading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenDevice: (deviceId: string) => void;
}

// Non-IoT units never connect, so instead of status / last seen / firmware
// the table shows warranty, which is how they are followed up.
export function NonIotDeviceTable({
  data,
  filters,
  loading = false,
  onPageChange,
  onOpenDevice,
}: NonIotDeviceTableProps) {
  const { t } = useTranslation('devices');

  const columns: ColumnsType<NonIotDevice> = [
    {
      title: t('table.columns.identity'),
      key: 'identity',
      render: (_: unknown, device) => (
        <div>
          <div className="text-[13px] font-semibold text-[#020204]">
            {device.id}
          </div>
          <div className="mt-1 text-xs text-[#636466]">{device.modelName}</div>
        </div>
      ),
    },
    {
      title: t('table.columns.region'),
      key: 'region',
      render: (_: unknown, device) => (
        <div>
          <div className="text-sm font-semibold text-[#020204]">
            {device.ownerId ?? '—'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-[#636466]">
            <EnvironmentOutlined />
            {[device.ward, device.region].filter(Boolean).join(', ')}
          </div>
        </div>
      ),
    },
    {
      title: t('nonIot.table.warranty'),
      key: 'warranty',
      render: (_: unknown, device) => <NonIotWarrantyCell device={device} />,
    },
    {
      title: t('nonIot.table.filterLife'),
      key: 'filterLife',
      render: (_: unknown, device) => <NonIotFilterLife device={device} />,
    },
    {
      title: t('table.columns.activatedAt'),
      key: 'activatedAt',
      render: (_: unknown, device) =>
        device.activatedAt ? formatDate(device.activatedAt) : '—',
    },
    {
      title: t('table.columns.actions'),
      key: 'actions',
      render: (_: unknown, device) => (
        <Button
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDevice(device.id);
          }}
        >
          {t('table.viewDetail')}
        </Button>
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
          onRow={(device) => ({
            onClick: () => onOpenDevice(device.id),
            className: 'cursor-pointer',
          })}
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => t('table.totalDevices', { total }),
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
                    {device.modelName} · {device.ownerId ?? '—'}
                  </div>
                </div>
                <NonIotWarrantyCell device={device} />
              </div>
              <NonIotFilterLife device={device} />
              <div className="flex justify-end border-t border-[#E7E8E9] pt-3">
                <Button type="link" onClick={() => onOpenDevice(device.id)}>
                  {t('table.viewDetail')}
                </Button>
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
