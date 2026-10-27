import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Layer,
  Map,
  Marker,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';

import {
  MAP_REGION_STATUSES,
  type MapRegionStatus,
} from '@/shared/constants/mapRegionStatus';

import type { MapRegion, MapSite } from '../schemas/mapSchemas';
import { buildVietnamMapStyle } from '../style/vietnamMapStyle';
import {
  joinRegions,
  loadProvinceBoundaries,
  type FeatureCollection,
} from '../utils/boundaries';
import { MAP_STATUS_COLORS, formatDeviceCountShort } from '../utils/mapFormat';
import { MapErrorBoundary } from './MapErrorBoundary';

// Vite bundles the dependency, so MapLibre cannot locate its own worker.
setWorkerUrl(workerUrl);

const VIETNAM_VIEW = { longitude: 106.0, latitude: 16.0, zoom: 4.6 };
// From this zoom on, districts replace their province marker (spec §5.2).
const DISTRICT_ZOOM = 9;
const MAX_BOUNDS: [number, number, number, number] = [90, -2, 130, 32];
const PROVINCE_FILL_LAYER = 'province-fill';

export interface DeviceMapCanvasProps {
  regions: MapRegion[];
  selectedRegionId?: string;
  sites: MapSite[];
  onSelectRegion: (id: string) => void;
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
    <Marker
      longitude={region.lng}
      latitude={region.lat}
      anchor="center"
      style={{ zIndex: selected ? 10 : 1 }}
    >
      <button
        type="button"
        title={label}
        aria-pressed={selected}
        aria-label={label}
        onClick={() => onSelect(region.id)}
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
    </Marker>
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

export function DeviceMapCanvas({
  regions,
  selectedRegionId,
  sites,
  onSelectRegion,
}: DeviceMapCanvasProps) {
  const { t, i18n } = useTranslation('maps');
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(VIETNAM_VIEW.zoom);
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null);
  const language = i18n.language.startsWith('vi') ? 'vi' : 'en';

  useEffect(() => {
    const controller = new AbortController();
    void loadProvinceBoundaries(controller.signal).then(setBoundaries);
    return () => controller.abort();
  }, []);

  const mapStyle = useMemo(
    () =>
      buildVietnamMapStyle(language, {
        paracel: t('canvas.labels.paracel'),
        spratly: t('canvas.labels.spratly'),
        eastSea: t('canvas.labels.eastSea'),
        gulfOfTonkin: t('canvas.labels.gulfOfTonkin'),
      }),
    [language, t]
  );

  const provinceData = useMemo(
    () => (boundaries ? joinRegions(boundaries, regions) : null),
    [boundaries, regions]
  );

  useEffect(() => {
    if (!selectedRegionId) return;
    const region = regions.find(
      (candidate) => candidate.id === selectedRegionId
    );
    if (!region) return;
    const target = region.level === 'district' ? DISTRICT_ZOOM + 1 : 7;
    mapRef.current?.flyTo({
      center: [region.lng, region.lat],
      zoom: Math.max(mapRef.current.getZoom(), target),
      duration: 800,
    });
  }, [regions, selectedRegionId]);

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

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const regionId: unknown = event.features?.[0]?.properties?.regionId;
    if (typeof regionId === 'string' && regionId) onSelectRegion(regionId);
  };

  return (
    <div className="space-y-2">
      <MapErrorBoundary
        fallback={
          <p role="alert" className="m-0 rounded-lg bg-[#FDECEC] p-4 text-sm">
            {t('canvas.loadError')}
          </p>
        }
      >
        <div
          role="region"
          aria-label={t('canvas.ariaLabel')}
          className="h-80 w-full overflow-hidden rounded-lg border border-[#E7E8E9] sm:h-[28rem]"
        >
          <Map
            ref={mapRef}
            initialViewState={VIETNAM_VIEW}
            mapStyle={mapStyle}
            minZoom={3.5}
            maxBounds={MAX_BOUNDS}
            interactiveLayerIds={provinceData ? [PROVINCE_FILL_LAYER] : []}
            onZoom={(event) => setZoom(event.viewState.zoom)}
            onClick={handleMapClick}
            attributionControl={{ compact: true }}
          >
            {provinceData ? (
              <Source id="provinces" type="geojson" data={provinceData}>
                <Layer
                  id={PROVINCE_FILL_LAYER}
                  type="fill"
                  paint={{
                    'fill-color': [
                      'match',
                      ['get', 'status'],
                      'warning',
                      MAP_STATUS_COLORS.warning,
                      'stable',
                      MAP_STATUS_COLORS.stable,
                      'rgba(0,0,0,0)',
                    ],
                    'fill-opacity': 0.18,
                  }}
                />
                <Layer
                  id="province-selected"
                  type="line"
                  filter={['==', ['get', 'regionId'], selectedRegionId ?? '']}
                  paint={{ 'line-color': '#0F62FE', 'line-width': 2.5 }}
                />
              </Source>
            ) : null}
            {visibleRegions.map((region) => (
              <RegionMarker
                key={region.id}
                region={region}
                selected={region.id === selectedRegionId}
                label={`${region.name} - ${formatDeviceCountShort(region.deviceCount)}`}
                onSelect={onSelectRegion}
              />
            ))}
            {sites.map((site) => (
              <Marker
                key={site.id}
                longitude={site.lng}
                latitude={site.lat}
                anchor="center"
              >
                <span
                  title={site.address}
                  className="block size-3 rounded-full border-2 border-white bg-[#0F62FE] shadow"
                />
              </Marker>
            ))}
          </Map>
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
