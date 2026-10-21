import { useDeferredValue, useState } from 'react';
import {
  ApiOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import { PageState } from '@/shared/components/PageState';

import { DeviceListTabs } from '../components/DeviceListTabs';
import { NonIotDeviceDrawer } from '../components/NonIotDeviceDrawer';
import { NonIotDeviceFilters } from '../components/NonIotDeviceFilters';
import { NonIotDeviceTable } from '../components/NonIotDeviceTable';
import { nonIotDeviceQueries } from '../queries/deviceListExtraQueries';
import type { NonIotDeviceListFilters } from '../schemas/nonIotDeviceSchemas';

export interface NonIotDeviceListPageProps {
  filters: NonIotDeviceListFilters;
}

// "Đang sử dụng" tab for non-IoT product lines: sold units followed up by
// warranty and core changes, since they never report a connection.
export function NonIotDeviceListPage({ filters }: NonIotDeviceListPageProps) {
  const { t } = useTranslation('devices');
  const navigate = useNavigate({ from: '/devices/' });
  const [openDeviceId, setOpenDeviceId] = useState<string>();
  // Deferred so a filter/page change keeps the current list on screen.
  const deferredFilters = useDeferredValue(filters);
  const { data } = useSuspenseQuery(nonIotDeviceQueries.list(deferredFilters));
  const { data: counts } = useSuspenseQuery(
    nonIotDeviceQueries.counts(deferredFilters)
  );

  const updateFilters = (changes: Partial<NonIotDeviceListFilters>) =>
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('listPage.title')}
        description={t('nonIot.description', { total: data.total })}
      />
      <DeviceListTabs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('nonIot.stats.total')}
          icon={<ApiOutlined />}
          tone="info"
          value={counts.total}
        />
        <PortalStatCard
          label={t('warrantyStatus.active')}
          icon={<SafetyCertificateOutlined />}
          tone="primary"
          value={counts.warrantyActive}
        />
        <PortalStatCard
          label={t('warrantyStatus.expiring')}
          icon={<ClockCircleOutlined />}
          tone="warning"
          value={counts.warrantyExpiring}
        />
        <PortalStatCard
          label={t('warrantyStatus.expired')}
          icon={<CloseCircleOutlined />}
          tone="danger"
          value={counts.warrantyExpired}
        />
      </div>
      <PortalCard padded={false}>
        <NonIotDeviceFilters
          filters={filters}
          onChange={updateFilters}
          onReset={() =>
            void navigate({
              search: {
                connectivity: 'non_iot',
                search: '',
                page: 1,
                pageSize: 10,
              },
            })
          }
        />
        {data.items.length === 0 ? (
          <PageState kind="empty" description={t('listPage.empty')} />
        ) : (
          <NonIotDeviceTable
            data={data}
            filters={deferredFilters}
            loading={deferredFilters !== filters}
            onOpenDevice={setOpenDeviceId}
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
          />
        )}
      </PortalCard>
      <NonIotDeviceDrawer
        deviceId={openDeviceId}
        onClose={() => setOpenDeviceId(undefined)}
      />
    </div>
  );
}
