import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from '@vis.gl/react-google-maps';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import { env } from '@/core/config/env';
import {
  MAP_REGION_STATUSES,
  type MapRegionStatus,
} from '@/shared/constants/mapRegionStatus';

import type { MapRegion, MapSite } from '../schemas/mapSchemas';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MAP_STATUS_COLORS, formatDeviceCountShort } from '../utils/mapFormat';

const VIETNAM_CENTER = { lat: 16.0, lng: 106.0 };
const DEFAULT_ZOOM = 5;
// From this zoom on, districts replace their province marker (spec §5.2).
const DISTRICT_ZOOM = 9;

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export interface DeviceMapCanvasProps {
  regions: MapRegion[];
  selectedRegionId?: string;
  sites: MapSite[];
  onSelectRegion: (id: string) => void;
}

function MapViewport({
  regions,
  selectedRegionId,
  onZoomChange,
  onReady,
}: {
  regions: MapRegion[];
  selectedRegionId?: string;
  onZoomChange: (zoom: number) => void;
  onReady: () => void;
}) {
  const map = useMap();

  // Advanced markers throw on unmount if the map has not rendered yet (React
  // StrictMode mounts twice), so markers wait for the first idle event.
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', onReady);
    return () => listener.remove();
  }, [map, onReady]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('zoom_changed', () =>
      onZoomChange(map.getZoom() ?? DEFAULT_ZOOM)
    );
    return () => listener.remove();
  }, [map, onZoomChange]);

  useEffect(() => {
    if (!map || !selectedRegionId) return;
    const region = regions.find(
      (candidate) => candidate.id === selectedRegionId
    );
    if (!region) return;
    map.panTo({ lat: region.lat, lng: region.lng });
    const target = region.level === 'district' ? DISTRICT_ZOOM + 1 : 7;
    if ((map.getZoom() ?? DEFAULT_ZOOM) < target) map.setZoom(target);
  }, [map, regions, selectedRegionId]);

  return null;
}

function RegionMarker({
  region,
  selected,
  label,
  onSelect,
}: {
  region: MapRegion;
  selected: boolean;
  label: string;
  onSelect: (id: string) => void;
}) {
  const size = Math.min(64, 30 + Math.sqrt(region.deviceCount) / 3);
  return (
    <AdvancedMarker
      position={{ lat: region.lat, lng: region.lng }}
      title={label}
      zIndex={selected ? 10 : 1}
      onClick={() => onSelect(region.id)}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={label}
        className="flex items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-md"
        style={{
          width: size,
          height: size,
          backgroundColor: MAP_STATUS_COLORS[region.status],
          outline: selected ? '3px solid #0F62FE' : undefined,
        }}
      >
        {formatDeviceCountShort(region.deviceCount)}
      </button>
    </AdvancedMarker>
  );
}

export function DeviceMapCanvas({
  regions,
  selectedRegionId,
  sites,
  onSelectRegion,
}: DeviceMapCanvasProps) {
  const { t, i18n } = useTranslation('maps');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [loadFailed, setLoadFailed] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  // Google reports a rejected key through a global callback, not an error.
  useEffect(() => {
    window.gm_authFailure = () => setAuthFailed(true);
    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  const parentsWithChildren = useMemo(
    () =>
      new Set(
        regions.flatMap((region) => (region.parentId ? [region.parentId] : []))
      ),
    [regions]
  );
  const visibleRegions = regions.filter((region) =>
    region.level === 'district'
      ? zoom >= DISTRICT_ZOOM
      : zoom < DISTRICT_ZOOM || !parentsWithChildren.has(region.id)
  );

  if (loadFailed) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('canvas.loadError')}
        className="h-full"
      />
    );
  }

  return (
    <div className="space-y-2">
      {authFailed ? (
        <Alert type="error" showIcon message={t('canvas.authError')} />
      ) : !env.googleMapsApiKey ? (
        <Alert type="warning" showIcon message={t('canvas.devMode')} />
      ) : null}
      <MapErrorBoundary
        fallback={
          <Alert type="error" showIcon message={t('canvas.loadError')} />
        }
      >
        <div
          role="region"
          aria-label={t('canvas.ariaLabel')}
          className="h-80 w-full overflow-hidden rounded-lg border border-[#E7E8E9] sm:h-[28rem]"
        >
          <APIProvider
            apiKey={env.googleMapsApiKey}
            language={i18n.language.startsWith('vi') ? 'vi' : 'en'}
            region="VN"
            onError={() => setLoadFailed(true)}
          >
            <Map
              mapId={env.googleMapsMapId}
              defaultCenter={VIETNAM_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              minZoom={4}
              gestureHandling="greedy"
              streetViewControl={false}
              mapTypeControl={false}
            >
              <MapViewport
                regions={regions}
                selectedRegionId={selectedRegionId}
                onZoomChange={setZoom}
                onReady={markReady}
              />
              {(ready ? visibleRegions : []).map((region) => (
                <RegionMarker
                  key={region.id}
                  region={region}
                  selected={region.id === selectedRegionId}
                  label={`${region.name} - ${formatDeviceCountShort(region.deviceCount)}`}
                  onSelect={onSelectRegion}
                />
              ))}
              {(ready ? sites : []).map((site) => (
                <AdvancedMarker
                  key={site.id}
                  position={{ lat: site.lat, lng: site.lng }}
                  title={site.address}
                >
                  <span className="block size-3 rounded-full border-2 border-white bg-[#0F62FE] shadow" />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>
      </MapErrorBoundary>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#636466]">
        <span className="font-semibold">{t('legend.title')}</span>
        {MAP_REGION_STATUSES.map(({ value, labelKey }) => (
          <LegendItem
            key={value}
            status={value}
            label={t(labelKey, { ns: 'common' })}
          />
        ))}
        <span>{t('legend.hint')}</span>
      </div>
    </div>
  );
}

function LegendItem({
  status,
  label,
}: {
  status: MapRegionStatus;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="size-3 rounded-full"
        style={{ backgroundColor: MAP_STATUS_COLORS[status] }}
      />
      {label}
    </span>
  );
}
