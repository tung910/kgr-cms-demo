import { useDeferredValue, useState, type ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  AppstoreOutlined,
  DisconnectOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';
import { PageState } from '@/shared/components/PageState';
import { CONNECTION_STATUSES } from '@/shared/constants/connectionStatus';
import type { Device } from '../schemas/deviceSchemas';

import { getAllDevices } from '../api/deviceApi';
import { DeviceFilters } from '../components/DeviceFilters';
import { DeviceListTabs } from '../components/DeviceListTabs';
import { DeviceTable } from '../components/DeviceTable';
import { deviceQueries } from '../queries/deviceQueries';
import { downloadDevicesCsv } from '../utils/exportDevicesToCsv';
import type { DeviceListFilters } from '../schemas/deviceSchemas';

export interface DeviceListPageProps {
  filters: DeviceListFilters;
}

const defaultFilters: DeviceListFilters = {
  search: '',
  page: 1,
  pageSize: 10,
};

const statCardConfig: Record<
  NonNullable<Device['status']>,
  { icon: ReactNode; tone: PortalTone }
> = {
  online: { icon: <WifiOutlined />, tone: 'primary' },
  warning: { icon: <WarningOutlined />, tone: 'danger' },
  offline: {
    icon: (
      <span
        className="flex size-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: '#F4F4F4', color: '#636466' }}
      >
        <DisconnectOutlined />
      </span>
    ),
    tone: 'primary',
  },
};

export function DeviceListPage({ filters }: DeviceListPageProps) {
  const { t } = useTranslation('devices');
  const navigate = useNavigate({ from: '/devices/' });
  // Deferred so a filter/page change keeps the current list on screen instead
  // of suspending back to the route skeleton.
  const deferredFilters = useDeferredValue(filters);
  const { data } = useSuspenseQuery(deviceQueries.list(deferredFilters));
  const { data: counts } = useSuspenseQuery(
    deviceQueries.statusCounts(deferredFilters)
  );
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const devices = await getAllDevices(filters);
      downloadDevicesCsv(devices);
      void message.success(
        t('listPage.exportSuccess', { count: devices.length })
      );
    } catch {
      void message.error(t('listPage.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const updateFilters = (changes: Partial<DeviceListFilters>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });
  };

  const openDevice = (deviceId: string) => {
    void navigate({ to: '/devices/$deviceId', params: { deviceId } });
  };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('listPage.title')}
        description={t('listPage.description', { total: data.total })}
        actions={
          <PermissionGuard capability="device.export">
            <Button loading={exporting} onClick={() => void handleExport()}>
              {t('listPage.export')}
            </Button>
          </PermissionGuard>
        }
      />
      <DeviceListTabs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('stats.total')}
          icon={<AppstoreOutlined />}
          tone="info"
          value={counts.total}
          detail={
            counts.nonIot > 0
              ? t('nonIot.includedInTotal', { count: counts.nonIot })
              : undefined
          }
        />
        {CONNECTION_STATUSES.map(({ value: status, labelKey }) => (
          <PortalStatCard
            key={status}
            label={t(labelKey, { ns: 'common' })}
            icon={statCardConfig[status].icon}
            tone={statCardConfig[status].tone}
            value={counts[status]}
          />
        ))}
      </div>
      <PortalCard padded={false}>
        <DeviceFilters
          filters={filters}
          onChange={updateFilters}
          onReset={() => void navigate({ search: defaultFilters })}
        />
        {data.items.length === 0 ? (
          <PageState kind="empty" description={t('listPage.empty')} />
        ) : (
          <DeviceTable
            data={data}
            filters={deferredFilters}
            loading={deferredFilters !== filters}
            onOpenDevice={openDevice}
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
          />
        )}
      </PortalCard>
    </div>
  );
}
