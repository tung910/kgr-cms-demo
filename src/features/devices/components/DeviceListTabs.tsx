import { ApiOutlined, WifiOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Segmented, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  PRODUCT_CONNECTIVITIES,
  type ProductConnectivity,
} from '@/shared/constants/productConnectivity';

import {
  inventoryQueries,
  nonIotDeviceQueries,
} from '../queries/deviceListExtraQueries';
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

// Lifecycle tabs (in use / never activated) plus the IoT / non-IoT switch.
// Omitted URL params mean "in use" and "IoT": the device list as it was, so
// the original view keeps its URL. Each combination has its own filters, so
// switching starts from a clean slate.
export function DeviceListTabs() {
  const { t } = useTranslation('devices');
  const navigate = useNavigate({ from: '/devices/' });
  const search = useSearch({ from: '/_authenticated/devices/' });
  const tab: DeviceListTab = search.tab ?? 'in-use';
  const connectivity: ProductConnectivity = search.connectivity ?? 'iot';

  const iotCounts = useQuery({
    ...deviceQueries.statusCounts(firstPage),
    enabled: connectivity === 'iot',
  });
  const nonIotCounts = useQuery({
    ...nonIotDeviceQueries.counts(firstPage),
    enabled: connectivity === 'non_iot',
  });
  const inventoryCounts = useQuery(
    inventoryQueries.counts({ ...firstPage, connectivity })
  );
  const inUseTotal =
    connectivity === 'iot' ? iotCounts.data?.total : nonIotCounts.data?.total;

  const go = (nextTab: DeviceListTab, next: ProductConnectivity) =>
    void navigate({
      search: {
        ...firstPage,
        ...(nextTab === 'inventory' && { tab: nextTab }),
        ...(next === 'non_iot' && { connectivity: next }),
      },
    });

  const productTypeSwitch = (
    <Segmented<ProductConnectivity>
      aria-label={t('listTabs.productTypeAriaLabel')}
      value={connectivity}
      options={PRODUCT_CONNECTIVITIES.map(({ value, labelKey }) => ({
        value,
        label: t(labelKey, { ns: 'common' }),
        icon: value === 'iot' ? <WifiOutlined /> : <ApiOutlined />,
      }))}
      onChange={(next) => go(tab, next)}
    />
  );

  return (
    <div>
      <Tabs
        activeKey={tab}
        className="-mb-2"
        onChange={(key) =>
          go(key === 'inventory' ? 'inventory' : 'in-use', connectivity)
        }
        tabBarExtraContent={{
          // Beside the tabs on wide screens; its own row below otherwise.
          right: <div className="hidden lg:block">{productTypeSwitch}</div>,
        }}
        items={[
          {
            key: 'in-use',
            label: <TabLabel label={t('listTabs.inUse')} count={inUseTotal} />,
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
      <div className="mt-4 flex flex-wrap items-center gap-2 lg:hidden">
        <span className="text-sm text-[#636466]">
          {t('listTabs.productTypeAriaLabel')}
        </span>
        {productTypeSwitch}
      </div>
    </div>
  );
}
