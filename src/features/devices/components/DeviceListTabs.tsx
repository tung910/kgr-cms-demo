import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';

import { inventoryQueries } from '../queries/deviceListExtraQueries';
import { deviceQueries } from '../queries/deviceQueries';
import type { DeviceListTab } from '../schemas/productConnectivitySchema';

const firstPage = { search: '', page: 1, pageSize: 10 } as const;

function TabLabel({ label, count }: { label: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      {count === undefined ? null : (
        <span className="rounded-full bg-[#F3F4F4] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#636466]">
          {count}
        </span>
      )}
    </span>
  );
}

// Lifecycle tabs: in use (bound to a customer) / never activated. Omitted
// `tab` means "in use", so the original list keeps its URL. Each tab has its
// own filters, so switching starts from a clean slate.
export function DeviceListTabs() {
  const { t } = useTranslation('devices');
  const navigate = useNavigate({ from: '/devices/' });
  const search = useSearch({ from: '/_authenticated/devices/' });
  const tab: DeviceListTab = search.tab ?? 'in-use';
  const inUseCounts = useQuery(deviceQueries.statusCounts(firstPage));
  const inventoryCounts = useQuery(inventoryQueries.counts(firstPage));

  return (
    <Tabs
      activeKey={tab}
      className="-mb-2"
      onChange={(key) =>
        void navigate({
          search: {
            ...firstPage,
            ...(key === 'inventory' && { tab: 'inventory' as const }),
          },
        })
      }
      items={[
        {
          key: 'in-use',
          label: (
            <TabLabel
              label={t('listTabs.inUse')}
              count={inUseCounts.data?.total}
            />
          ),
        },
        {
          key: 'inventory',
          label: (
            <TabLabel
              label={t('listTabs.inventory')}
              count={inventoryCounts.data?.total}
            />
          ),
        },
      ]}
    />
  );
}
