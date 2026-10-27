import { HttpResponse, http } from 'msw';

import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import type { MapRegionStatus } from '@/shared/constants/mapRegionStatus';

import type {
  MapRegionDetailDto,
  MapRegionDto,
  MapRegionInsight,
} from '../schemas/mapSchemas';
import { generatedProvinceSeeds } from './provinceSeeds';

// Mock backend for the device map (spec §5). The real service aggregates by
// region and strips exact locations for roles without
// `device_map.location.exact`; both happen here so components never mask.

const roleKey = 'cms-portal:mock-auth-role'; // shared with handlers.ts
const dayMs = 86_400_000;

// ASSUMPTION: the spec leaves the TDS alert threshold open; 150 ppm is a
// placeholder served by the API so the UI never hard-codes it.
const TDS_THRESHOLD = 150;
const LOW_COVERAGE_DEVICES = 1_500;

const MODELS = ['KGR-A100', 'KGR-B200', 'KGR-C300'] as const;

export interface RegionSeed {
  id: string;
  name: string;
  lat: number;
  lng: number;
  // Installed units per model, in MODELS order.
  counts: readonly [number, number, number];
  tds: number;
  since: string;
  districts?: ReadonlyArray<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    share: number;
  }>;
}

const handwrittenSeeds: readonly RegionSeed[] = [
  {
    id: 'hn',
    name: 'Hà Nội',
    lat: 21.0285,
    lng: 105.8542,
    counts: [14200, 9800, 4300],
    tds: 128,
    since: '2023-01-10',
    districts: [
      {
        id: 'hn-hk',
        name: 'Hoàn Kiếm',
        lat: 21.0285,
        lng: 105.852,
        share: 0.2,
      },
      {
        id: 'hn-cg',
        name: 'Cầu Giấy',
        lat: 21.0333,
        lng: 105.7942,
        share: 0.3,
      },
      {
        id: 'hn-hd',
        name: 'Hà Đông',
        lat: 20.9714,
        lng: 105.7788,
        share: 0.25,
      },
    ],
  },
  {
    id: 'hcm',
    name: 'TP. Hồ Chí Minh',
    lat: 10.8231,
    lng: 106.6297,
    counts: [19800, 12600, 7100],
    tds: 176,
    since: '2023-01-10',
    districts: [
      {
        id: 'hcm-q1',
        name: 'Quận 1',
        lat: 10.7769,
        lng: 106.7009,
        share: 0.15,
      },
      {
        id: 'hcm-td',
        name: 'Thủ Đức',
        lat: 10.8494,
        lng: 106.7537,
        share: 0.3,
      },
      {
        id: 'hcm-bt',
        name: 'Bình Tân',
        lat: 10.7654,
        lng: 106.6038,
        share: 0.25,
      },
    ],
  },
  {
    id: 'dn',
    name: 'Đà Nẵng',
    lat: 16.0544,
    lng: 108.2022,
    counts: [4100, 2900, 1200],
    tds: 96,
    since: '2023-06-01',
    districts: [
      {
        id: 'dn-hc',
        name: 'Hải Châu',
        lat: 16.0678,
        lng: 108.2208,
        share: 0.4,
      },
      { id: 'dn-st', name: 'Sơn Trà', lat: 16.1006, lng: 108.2433, share: 0.3 },
    ],
  },
  {
    id: 'hp',
    name: 'Hải Phòng',
    lat: 20.8449,
    lng: 106.6881,
    counts: [3200, 2100, 900],
    tds: 162,
    since: '2023-03-15',
  },
  {
    id: 'ct',
    name: 'Cần Thơ',
    lat: 10.0452,
    lng: 105.7469,
    counts: [3600, 2300, 1000],
    tds: 188,
    since: '2023-05-20',
  },
  {
    id: 'hue',
    name: 'Thừa Thiên Huế',
    lat: 16.4637,
    lng: 107.5909,
    counts: [1500, 900, 300],
    tds: 84,
    since: '2024-01-08',
  },
  {
    id: 'kh',
    name: 'Khánh Hòa',
    lat: 12.2388,
    lng: 109.1967,
    counts: [1800, 1100, 500],
    tds: 112,
    since: '2023-09-12',
  },
  {
    id: 'lam',
    name: 'Lâm Đồng',
    lat: 11.9404,
    lng: 108.4583,
    counts: [1300, 700, 200],
    tds: 58,
    since: '2024-02-19',
  },
  {
    id: 'bd',
    name: 'Bình Dương',
    lat: 11.1693,
    lng: 106.6684,
    counts: [5200, 3300, 1500],
    tds: 141,
    since: '2023-02-01',
  },
  {
    id: 'dnai',
    name: 'Đồng Nai',
    lat: 10.9574,
    lng: 106.8426,
    counts: [4700, 3000, 1300],
    tds: 154,
    since: '2023-02-01',
  },
  {
    id: 'na',
    name: 'Nghệ An',
    lat: 18.6796,
    lng: 105.6813,
    counts: [1700, 800, 300],
    tds: 102,
    since: '2023-11-03',
  },
  {
    id: 'qn',
    name: 'Quảng Ninh',
    lat: 21.0064,
    lng: 107.2925,
    counts: [1400, 900, 400],
    tds: 119,
    since: '2024-03-04',
  },
  {
    id: 'bmt',
    name: 'Đắk Lắk',
    lat: 12.71,
    lng: 108.2378,
    counts: [700, 400, 100],
    tds: 71,
    since: '2024-04-22',
  },
];

// All 63 provinces: hand-written seeds plus generated placeholders.
const provinceSeeds: readonly RegionSeed[] = [
  ...handwrittenSeeds,
  ...generatedProvinceSeeds,
];

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}

function forbidden() {
  return HttpResponse.json({ message: 'forbidden' }, { status: 403 });
}

interface Filters {
  model: string | null;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

function readFilters(url: URL): Filters {
  const param = (name: string) => url.searchParams.get(name)?.trim() || null;
  return {
    model: param('model'),
    status: param('status'),
    dateFrom: param('date_from'),
    dateTo: param('date_to'),
  };
}

// Share of a region's installed base activated inside the filtered window,
// assuming activations are spread evenly since the region went live.
function periodRatio(since: string, { dateFrom, dateTo }: Filters): number {
  const start = Date.parse(since);
  const end = Date.now();
  const from = Math.max(start, dateFrom ? Date.parse(dateFrom) : start);
  const to = Math.min(end, dateTo ? Date.parse(dateTo) + dayMs : end);
  return Math.max(0, to - from) / (end - start);
}

function insightOf(
  tds: number,
  deviceCount: number
): { status: MapRegionStatus; insight: MapRegionInsight } {
  if (tds > TDS_THRESHOLD) return { status: 'warning', insight: 'high_tds' };
  if (deviceCount < LOW_COVERAGE_DEVICES)
    return { status: 'stable', insight: 'low_coverage' };
  return { status: 'stable', insight: 'stable' };
}

function deviceCountFor(
  counts: readonly number[],
  since: string,
  filters: Filters
): number {
  const modelIndex = filters.model
    ? MODELS.indexOf(filters.model as (typeof MODELS)[number])
    : -1;
  const base =
    modelIndex >= 0
      ? (counts[modelIndex] ?? 0)
      : counts.reduce((sum, value) => sum + value, 0);
  return Math.round(base * periodRatio(since, filters));
}

function buildRegions(filters: Filters, exact: boolean): MapRegionDto[] {
  const regions: MapRegionDto[] = [];
  for (const seed of provinceSeeds) {
    const deviceCount = deviceCountFor(seed.counts, seed.since, filters);
    if (deviceCount === 0) continue;
    regions.push({
      id: seed.id,
      name: seed.name,
      level: 'province',
      parent_id: null,
      lat: seed.lat,
      lng: seed.lng,
      device_count: deviceCount,
      avg_tds: seed.tds,
      ...insightOf(seed.tds, deviceCount),
    });
    // District drill-down is exact-location data: only roles allowed to see
    // install addresses get it (spec §5.5).
    if (!exact) continue;
    for (const district of seed.districts ?? []) {
      const count = Math.round(deviceCount * district.share);
      if (count === 0) continue;
      const tds = seed.tds + (district.share > 0.28 ? 14 : -9);
      regions.push({
        id: district.id,
        name: district.name,
        level: 'district',
        parent_id: seed.id,
        lat: district.lat,
        lng: district.lng,
        device_count: count,
        avg_tds: tds,
        ...insightOf(tds, count),
      });
    }
  }
  return regions.filter(
    (region) => !filters.status || region.status === filters.status
  );
}

function buildSites(region: MapRegionDto): MapRegionDetailDto['sites'] {
  const streets = ['Nguyễn Trãi', 'Lê Lợi', 'Trần Hưng Đạo', 'Hai Bà Trưng'];
  return Array.from({ length: 6 }, (_, index) => ({
    id: `${region.id}-site-${index + 1}`,
    lat: region.lat + Math.sin(index * 1.7 + 1) * 0.02,
    lng: region.lng + Math.cos(index * 2.3 + 1) * 0.02,
    address: `${12 + index * 7} ${streets[index % streets.length]}, ${region.name}`,
  }));
}

export const mapHandlers = [
  http.get('/api/device-map/summary', ({ request }) => {
    if (!allowed('device_map.read')) return forbidden();
    const url = new URL(request.url);
    if (url.searchParams.get('mock_error') === '500')
      return HttpResponse.json(
        { message: 'Mock server error' },
        { status: 500 }
      );
    const provinces = buildRegions(readFilters(url), false);
    const total = provinces.reduce((sum, r) => sum + r.device_count, 0);
    const weighted = provinces.reduce(
      (sum, r) => sum + r.avg_tds * r.device_count,
      0
    );
    return HttpResponse.json({
      total_devices: total,
      region_count: provinces.length,
      alert_region_count: provinces.filter((r) => r.status === 'warning')
        .length,
      avg_tds: total ? Math.round(weighted / total) : 0,
    });
  }),
  http.get('/api/device-map/regions', ({ request }) => {
    if (!allowed('device_map.read')) return forbidden();
    const url = new URL(request.url);
    if (url.searchParams.get('mock_error') === '500')
      return HttpResponse.json(
        { message: 'Mock server error' },
        { status: 500 }
      );
    const exact = allowed('device_map.location.exact');
    return HttpResponse.json({
      regions: buildRegions(readFilters(url), exact),
      tds_threshold: TDS_THRESHOLD,
      models: [...MODELS],
      exact_location: exact,
    });
  }),
  http.get('/api/device-map/regions/:regionId', ({ params }) => {
    if (!allowed('device_map.read')) return forbidden();
    const exact = allowed('device_map.location.exact');
    const region = buildRegions(
      { model: null, status: null, dateFrom: null, dateTo: null },
      exact
    ).find((candidate) => candidate.id === params.regionId);
    if (!region)
      return HttpResponse.json({ message: 'not found' }, { status: 404 });
    return HttpResponse.json({
      ...region,
      sites: exact ? buildSites(region) : [],
    });
  }),
];
