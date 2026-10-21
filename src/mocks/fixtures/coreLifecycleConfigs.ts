import type {
  CoreLifecycleConfigDto,
  CoreSkuDto,
} from '@/features/serials/schemas/coreLifecycleSchemas';

// M04.1: lifespan and thresholds live on the core SKU, shared by every model
// that fits it. TDS bands are placeholders until R&D signs off the real table.
const TDS_BANDS = [
  { min_ppm: 0, max_ppm: 150, factor: 1 },
  { min_ppm: 150, max_ppm: 300, factor: 1.3 },
  { min_ppm: 300, max_ppm: 500, factor: 1.6 },
  { min_ppm: 500, factor: 2 },
];

function core(
  sku: string,
  name: string,
  months: number,
  liters: number,
  extra: Partial<CoreSkuDto> = {}
): CoreSkuDto {
  return {
    sku,
    name,
    kind: 'standard',
    lifespan_months: months,
    lifespan_liters: liters,
    warning_level1_percent: 70,
    warning_level2_percent: 90,
    sale_regions: [],
    tds_factors: TDS_BANDS,
    ...extra,
  };
}

const cores: CoreSkuDto[] = [
  core('CORE-PP', 'PP Cotton', 6, 3000, {
    guide_video_url: 'https://example.com/guides/core-pp',
  }),
  core('CORE-PP-ALUM', 'PP xử lý phèn', 4, 2500, {
    kind: 'poor_water',
    sale_regions: ['Đồng bằng sông Cửu Long'],
  }),
  core('CORE-CARBON', 'Carbon Block', 9, 4500),
  core('CORE-RO', 'RO Membrane', 24, 12000),
  core('CORE-POST', 'Post Carbon', 12, 6000, { tds_factors: [] }),
  core('CORE-MINERAL', 'Mineral', 12, 6000, { tds_factors: [] }),
  core('CORE-HYDROGEN', 'Hydrogen', 12, 6000, { tds_factors: [] }),
];

function position(
  index: number,
  name: string,
  compatible: string[]
): CoreLifecycleConfigDto['model_layouts'][number]['positions'][number] {
  return {
    position: String(index + 1),
    name,
    compatible_skus: compatible,
    default_sku: compatible[0]!,
  };
}

const fiveCoreLayout = [
  position(0, 'Lõi 1 · PP', ['CORE-PP', 'CORE-PP-ALUM']),
  position(1, 'Lõi 2 · Carbon', ['CORE-CARBON']),
  position(2, 'Lõi 3 · RO', ['CORE-RO']),
  position(3, 'Lõi 4 · Post Carbon', ['CORE-POST']),
  position(4, 'Lõi 5 · Mineral', ['CORE-MINERAL']),
];

export const coreLifecycleConfigFixture: CoreLifecycleConfigDto = {
  cores,
  model_layouts: [
    { model_id: 'model-a100', positions: fiveCoreLayout },
    { model_id: 'model-b200', positions: fiveCoreLayout.slice(0, 3) },
    { model_id: 'model-n110', positions: fiveCoreLayout.slice(0, 4) },
    { model_id: 'model-n120', positions: fiveCoreLayout },
    {
      model_id: 'model-c300',
      positions: [
        ...fiveCoreLayout,
        position(5, 'Lõi 6 · Hydrogen', ['CORE-HYDROGEN']),
        position(6, 'Lõi 7 · Mineral', ['CORE-MINERAL']),
      ],
    },
  ],
  campaigns: [
    {
      id: 'campaign-q3-pp',
      name: 'Nhắc thay lõi PP Q3',
      sku: 'CORE-PP',
      push_content: 'Lõi PP sắp hết hạn, đặt lõi mới ngay hôm nay!',
      cta_label: 'Mua lõi ngay',
      deeplink: 'onekangaroo://core-shop?sku=CORE-PP',
      starts_at: '2026-09-01T00:00:00.000Z',
      ends_at: '2026-09-30T23:59:59.000Z',
    },
  ],
  audit_log: [
    {
      id: 'core-config-audit-1',
      actor: 'admin@kgr.local',
      changed_at: '2026-09-01T08:00:00.000Z',
      field: 'warningLevel1Percent (CORE-PP)',
      before_value: '60',
      after_value: '70',
    },
  ],
};
