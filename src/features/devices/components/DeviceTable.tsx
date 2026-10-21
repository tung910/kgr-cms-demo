import { EnvironmentOutlined } from '@ant-design/icons';
import { Button, Pagination, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { PortalProgress, type PortalTone } from '@/shared/components/portal';
import { toneColors } from '@/shared/components/portal/tone';
import {
  formatDate,
  formatDateTimeInLocale as formatDateTime,
  formatRelativeTime,
} from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import type { Device, DeviceListFilters } from '../schemas/deviceSchemas';
import { DeviceStatusCell } from './DeviceStatusCell';

function filterLifeTone(percent: number): PortalTone {
  if (percent <= 20) return 'danger';
  if (percent <= 50) return 'warning';
  return 'primary';
}

function lastSeenLabel(
  value: string | null,
  locale: string | undefined,
  justNow: string
): string {
  if (!value) return '—';
  return formatRelativeTime(value, locale) ?? justNow;
}

function FilterLifeIndicator({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const core = device.attentionCore;
  const percent = core ? core.remainingPercent : device.filterLifePercent;
  const tone = filterLifeTone(percent);
  const expired = percent <= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        {core ? (
          <span
            className="rounded-md border px-2 py-0.5 text-xs font-medium"
            style={
              expired
                ? {
                    backgroundColor: toneColors.danger.bg,
                    borderColor: toneColors.danger.fg,
                    color: toneColors.danger.fg,
                  }
                : {
                    backgroundColor: '#F3F4F4',
                    borderColor: '#E7E8E9',
                    color: '#020204',
                  }
            }
          >
            {t('table.attentionCore.label', {
              position: core.position,
              name: core.coreName,
            })}
          </span>
        ) : (
          <span />
        )}
        <span
          className="whitespace-nowrap text-xs font-semibold tabular-nums"
          style={{ color: toneColors[tone].fg }}
        >
          {percent}%{expired ? ` · ${t('table.attentionCore.expired')}` : null}
        </span>
      </div>
      {/* An expired core fills the bar in red so it stands out from low ones. */}
      <PortalProgress value={expired ? 100 : percent} max={100} tone={tone} />
    </div>
  );
}

export interface DeviceTableProps {
  data: PageResponse<Device>;
  filters: DeviceListFilters;
  loading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenDevice: (deviceId: string) => void;
}

export function DeviceTable({
  data,
  filters,
  loading = false,
  onPageChange,
  onOpenDevice,
}: DeviceTableProps) {
  const { t, i18n } = useTranslation('devices');

  const columns: ColumnsType<Device> = [
    {
      title: t('table.columns.identity'),
      key: 'identity',
      render: (_: unknown, device: Device) => (
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
      render: (_: unknown, device: Device) => (
        <div>
          {device.owner ? (
            <div className="text-sm font-semibold text-[#020204]">
              {device.owner.name ?? device.owner.id}
            </div>
          ) : null}
          <div className="mt-1 flex items-center gap-1 text-xs text-[#636466]">
            <EnvironmentOutlined />
            {device.ward ? `${device.ward}, ${device.region}` : device.region}
          </div>
        </div>
      ),
    },
    {
      title: t('table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: unknown, device: Device) => (
        <DeviceStatusCell device={device} />
      ),
    },
    {
      title: t('table.columns.lastSeen'),
      key: 'lastSeen',
      render: (_: unknown, device: Device) => (
        <span
          className="whitespace-nowrap text-xs text-[#636466]"
          title={formatDateTime(device.lastOnlineAt, i18n.resolvedLanguage)}
        >
          {lastSeenLabel(
            device.lastOnlineAt,
            i18n.resolvedLanguage,
            t('table.justNow')
          )}
        </span>
      ),
    },
    {
      title: t('table.columns.filterLife'),
      key: 'filterLife',
      width: 280,
      // Non-IoT units report no core life.
      render: (_: unknown, device: Device) =>
        device.connectivity === 'non_iot' ? (
          <span className="text-xs text-[#9A9B9C]">—</span>
        ) : (
          <FilterLifeIndicator device={device} />
        ),
    },
    {
      title: t('table.columns.firmware'),
      key: 'firmware',
      render: (_: unknown, device: Device) =>
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
          </div>
        ),
    },
    {
      title: t('table.columns.activatedAt'),
      key: 'activatedAt',
      render: (_: unknown, device: Device) => (
        <span className="whitespace-nowrap text-xs">
          {formatDate(device.activatedAt)}
        </span>
      ),
    },
    {
      title: t('table.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 130,
      className: 'whitespace-nowrap',
    },
  ];

  const tableColumns = columns.map((column) =>
    column.key === 'actions'
      ? {
          ...column,
          render: (_: unknown, device: Device) => (
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
        }
      : column
  );

  return (
    <>
      <div className="hidden pb-2 lg:block">
        <Table
          rowKey="id"
          size="middle"
          columns={tableColumns}
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
            <div key={device.id} className="p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onOpenDevice(device.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Typography.Text strong>{device.id}</Typography.Text>
                    <div className="mt-1 text-sm text-[#636466]">
                      {device.modelName} ·{' '}
                      {device.ward
                        ? `${device.ward}, ${device.region}`
                        : device.region}
                    </div>
                  </div>
                  <DeviceStatusCell device={device} />
                </div>
                {device.connectivity === 'non_iot' ? null : (
                  <div className="mt-3">
                    <FilterLifeIndicator device={device} />
                  </div>
                )}
              </button>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E7E8E9] pt-3">
                <Typography.Text type="secondary" className="text-xs">
                  {t('table.lastOnlineLabel', {
                    time: lastSeenLabel(
                      device.lastOnlineAt,
                      i18n.resolvedLanguage,
                      t('table.justNow')
                    ),
                  })}
                </Typography.Text>
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
