import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import { PageState } from '@/shared/components/PageState';

import { DeviceMapCanvas } from '../components/DeviceMapCanvas';
import { MapFilters, type MapFiltersValue } from '../components/MapFilters';
import { mapMockData, type MarkerStatus } from '../mocks/mapMockData';

export function MapPage() {
  const { t } = useTranslation('maps');
  const statusLabels: Record<MarkerStatus, string> = {
    online: t('status.online'),
    offline: t('status.offline'),
    alert: t('status.alert'),
  };
  const [filters, setFilters] = useState<MapFiltersValue>({});
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const updateFilters = (changes: Partial<MapFiltersValue>) => {
    setFilters((previous) => ({ ...previous, ...changes }));
  };

  const regions = useMemo(
    () => [...new Set(mapMockData.map((marker) => marker.region))],
    []
  );

  const filteredMarkers = useMemo(
    () =>
      mapMockData.filter((marker) => {
        if (filters.status && marker.status !== filters.status) return false;
        if (filters.region && marker.region !== filters.region) return false;
        return true;
      }),
    [filters]
  );

  const selectedMarker = filteredMarkers.find(
    (marker) => marker.id === selectedMarkerId
  );

  const alertCount = mapMockData.filter(
    (marker) => marker.status === 'alert'
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PortalStatCard
          label={t('stats.totalDevices')}
          value={mapMockData.length}
        />
        <PortalStatCard label={t('stats.alerting')} value={alertCount} />
        <PortalStatCard label={t('stats.regions')} value={regions.length} />
      </div>
      <PortalCard padded={false}>
        <MapFilters
          value={filters}
          regions={regions}
          onChange={updateFilters}
        />
        {filteredMarkers.length === 0 ? (
          <div className="p-4">
            <PageState
              kind="empty"
              description={t('empty.noMatchingDevices')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DeviceMapCanvas
                markers={filteredMarkers}
                selectedMarkerId={selectedMarkerId}
                onSelectMarker={setSelectedMarkerId}
              />
            </div>
            <div className="rounded-lg border border-[#E7E8E9] p-4">
              {selectedMarker ? (
                <div className="space-y-2">
                  <div className="font-mono text-sm font-semibold">
                    {selectedMarker.id}
                  </div>
                  <div className="text-sm text-[#636466]">
                    {t('detail.region', { region: selectedMarker.region })}
                  </div>
                  <div className="text-sm text-[#636466]">
                    {t('detail.status', {
                      status: statusLabels[selectedMarker.status],
                    })}
                  </div>
                </div>
              ) : (
                <PageState kind="empty" description={t('empty.selectDevice')} />
              )}
            </div>
          </div>
        )}
      </PortalCard>
    </div>
  );
}
