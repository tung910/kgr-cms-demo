import { useDeferredValue } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  InboxOutlined,
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
import { InventoryFilters } from '../components/InventoryFilters';
import { InventoryTable } from '../components/InventoryTable';
import { AGED_STOCK_DAYS, AGING_WARNING_DAYS } from '../constants/inventory';
import { inventoryQueries } from '../queries/deviceListExtraQueries';
import type { InventoryListFilters } from '../schemas/inventorySchemas';

export interface InventoryListPageProps {
  filters: InventoryListFilters;
}

// "Tồn kho (chưa sử dụng)" tab: units that left the factory but were never
// activated (bound to a customer).
export function InventoryListPage({ filters }: InventoryListPageProps) {
  const { t } = useTranslation('devices');
  const navigate = useNavigate({ from: '/devices/' });
  // Deferred so a filter/page change keeps the current list on screen.
  const deferredFilters = useDeferredValue(filters);
  const { data } = useSuspenseQuery(inventoryQueries.list(deferredFilters));
  const { data: counts } = useSuspenseQuery(
    inventoryQueries.counts(deferredFilters)
  );

  const updateFilters = (changes: Partial<InventoryListFilters>) =>
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('listPage.title')}
        description={t('inventory.description', { total: data.total })}
      />
      <DeviceListTabs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('inventory.stats.total')}
          icon={<InboxOutlined />}
          tone="info"
          value={counts.total}
        />
        <PortalStatCard
          label={t('inventory.stats.fresh', { days: AGING_WARNING_DAYS })}
          icon={<CheckCircleOutlined />}
          tone="primary"
          value={counts.total - counts.aging - counts.aged}
        />
        <PortalStatCard
          label={t('inventory.stats.aging', {
            from: AGING_WARNING_DAYS,
            to: AGED_STOCK_DAYS,
          })}
          icon={<FieldTimeOutlined />}
          tone="warning"
          value={counts.aging}
        />
        <PortalStatCard
          label={t('inventory.stats.aged', { days: AGED_STOCK_DAYS })}
          icon={<ClockCircleOutlined />}
          tone="danger"
          value={counts.aged}
        />
      </div>
      <PortalCard padded={false}>
        <InventoryFilters
          filters={filters}
          onChange={updateFilters}
          onReset={() =>
            void navigate({
              search: {
                tab: 'inventory',
                search: '',
                page: 1,
                pageSize: 10,
              },
            })
          }
        />
        {data.items.length === 0 ? (
          <PageState kind="empty" description={t('inventory.empty')} />
        ) : (
          <InventoryTable
            data={data}
            filters={deferredFilters}
            loading={deferredFilters !== filters}
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
