import { useDeferredValue } from 'react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import { PageState } from '@/shared/components/PageState';

import { DeviceMapCanvas } from '../components/DeviceMapCanvas';
import { MapFilters } from '../components/MapFilters';
import { RegionDetailPanel } from '../components/RegionDetailPanel';
import { RegionRankingTable } from '../components/RegionRankingTable';
import { mapQueries } from '../queries/mapQueries';
import type { MapFilters as MapFiltersValue } from '../schemas/mapSchemas';
import { downloadMapReportCsv } from '../utils/exportMapReportToCsv';

export interface MapPageFilters extends MapFiltersValue {
  regionId?: string;
}

export interface MapPageProps {
  filters: MapPageFilters;
}

export function MapPage({ filters }: MapPageProps) {
  const { t } = useTranslation('maps');
  const navigate = useNavigate({ from: '/maps/' });
  const { regionId, ...dataFilters } = useDeferredValue(filters);
  const { data: summary } = useSuspenseQuery(mapQueries.summary(dataFilters));
  const { data: regionData } = useSuspenseQuery(
    mapQueries.regions(dataFilters)
  );
  const detailQuery = useQuery({
    ...mapQueries.regionDetail(regionId ?? ''),
    enabled: Boolean(regionId),
  });

  const selectedRegion = regionData.regions.find(
    (region) => region.id === regionId
  );

  const updateSearch = (changes: Partial<MapPageFilters>) => {
    void navigate({ search: (previous) => ({ ...previous, ...changes }) });
  };

  // Changing the data filters may drop the selected region from the map.
  const updateFilters = (changes: Partial<MapFiltersValue>) =>
    updateSearch({ ...changes, regionId: undefined });

  const handleExport = () => {
    downloadMapReportCsv(regionData.regions, {
      headers: {
        region: t('export.headers.region'),
        level: t('export.headers.level'),
        devices: t('export.headers.devices'),
        avgTds: t('export.headers.avgTds'),
        status: t('export.headers.status'),
      },
      level: (region) => t(`export.level.${region.level}`),
      status: (region) =>
        t(`mapRegionStatus.${region.status}`, { ns: 'common' }),
    });
    void message.success(
      t('export.success', { count: regionData.regions.length })
    );
  };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description')}
        actions={
          <PermissionGuard capability="device_map.export">
            <Button
              disabled={regionData.regions.length === 0}
              onClick={handleExport}
            >
              {t('export.button')}
            </Button>
          </PermissionGuard>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('stats.totalDevices')}
          icon={<AppstoreOutlined />}
          tone="info"
          value={summary.totalDevices.toLocaleString()}
        />
        <PortalStatCard
          label={t('stats.regions')}
          icon={<EnvironmentOutlined />}
          value={summary.regionCount}
        />
        <PortalStatCard
          label={t('stats.alertRegions')}
          icon={<WarningOutlined />}
          tone="danger"
          value={summary.alertRegionCount}
        />
        <PortalStatCard
          label={t('stats.avgTds')}
          icon={<ExperimentOutlined />}
          value={summary.avgTds}
          unit={t('stats.tdsUnit')}
        />
      </div>
      <PortalCard padded={false}>
        <MapFilters
          value={dataFilters}
          models={regionData.models}
          onChange={updateFilters}
        />
        {regionData.regions.length === 0 ? (
          <div className="p-4">
            <PageState kind="empty" description={t('empty.noRegions')} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DeviceMapCanvas
                regions={regionData.regions}
                selectedRegionId={regionId}
                sites={detailQuery.data?.sites ?? []}
                onSelectRegion={(id) => updateSearch({ regionId: id })}
              />
            </div>
            <RegionDetailPanel
              region={selectedRegion}
              sites={detailQuery.data?.sites ?? []}
              exactLocation={regionData.exactLocation}
              tdsThreshold={regionData.tdsThreshold}
              loading={detailQuery.isPending && Boolean(regionId)}
              failed={detailQuery.isError}
              onClear={() => updateSearch({ regionId: undefined })}
            />
          </div>
        )}
      </PortalCard>
      {regionData.regions.length > 0 ? (
        <PortalCard>
          <h2 className="m-0 mb-3 text-base font-semibold">
            {t('ranking.title')}
          </h2>
          <RegionRankingTable
            regions={regionData.regions}
            tdsThreshold={regionData.tdsThreshold}
            selectedRegionId={regionId}
            onSelectRegion={(id) => updateSearch({ regionId: id })}
          />
        </PortalCard>
      ) : null}
    </div>
  );
}
