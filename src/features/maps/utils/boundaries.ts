import type { MapRegion } from '../schemas/mapSchemas';

// Minimal GeoJSON shapes: the boundary file is only read and re-stamped here,
// geometry is passed through to MapLibre untouched.
interface Feature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: unknown;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

// Self-hosted administrative boundaries (province level). The file is optional:
// without it the map still shows OpenStreetMap province lines and markers.
export const PROVINCE_BOUNDARIES_URL = '/geo/vn-provinces.geojson';

const NAME_KEYS = ['NAME_1', 'name', 'Name', 'ten_tinh', 'ten', 'shapeName'];

export function normalizeRegionName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\b(tinh|thanh pho|tp|city|province)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

function featureName(feature: Feature): string | undefined {
  for (const key of NAME_KEYS) {
    const value = feature.properties?.[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

export async function loadProvinceBoundaries(
  signal?: AbortSignal
): Promise<FeatureCollection | null> {
  try {
    const response = await fetch(PROVINCE_BOUNDARIES_URL, { signal });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      (data as { type?: unknown }).type === 'FeatureCollection'
    ) {
      return data as FeatureCollection;
    }
    return null;
  } catch {
    // Missing file (the dev server answers with index.html) or aborted fetch.
    return null;
  }
}

// Stamps each province polygon with the matching region's id and status so
// the map can colour and select it without a second lookup.
export function joinRegions(
  boundaries: FeatureCollection,
  regions: readonly MapRegion[]
): FeatureCollection {
  const byName = new Map(
    regions
      .filter((region) => region.level === 'province')
      .map((region) => [normalizeRegionName(region.name), region])
  );
  return {
    ...boundaries,
    features: boundaries.features.map((feature) => {
      const name = featureName(feature);
      const region = name ? byName.get(normalizeRegionName(name)) : undefined;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          regionId: region?.id ?? '',
          status: region?.status ?? '',
        },
      };
    }),
  };
}
