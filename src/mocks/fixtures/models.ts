import { nonIotProductsEnabled } from './nonIotProducts';

// Mirrors what the business-vertical system exposes to the portal: enough to
// identify a model and know what hardware it has, nothing the portal is
// allowed to edit (spec §1.3).
export interface ModelReferenceDto {
  model_id: string;
  code: string;
  name: string;
  industry: string;
  has_hot_tank: boolean;
  has_cold_tank: boolean;
  supports_membrane_flush: boolean;
}

const iotModelFixtures: readonly ModelReferenceDto[] = [
  {
    model_id: 'model-a100',
    code: 'KGR-A100',
    name: 'Kangaroo Hydro A100',
    industry: 'water_purifier',
    has_hot_tank: true,
    has_cold_tank: true,
    supports_membrane_flush: true,
  },
  {
    model_id: 'model-b200',
    code: 'KGR-B200',
    name: 'Kangaroo Hydro B200',
    industry: 'water_purifier',
    has_hot_tank: false,
    has_cold_tank: true,
    supports_membrane_flush: true,
  },
  {
    model_id: 'model-c300',
    code: 'KGR-C300',
    name: 'Kangaroo Hydro C300 Pro',
    industry: 'water_purifier',
    has_hot_tank: true,
    has_cold_tank: true,
    supports_membrane_flush: true,
  },
];

// Non-IoT lines: same catalogue, no IoT module on board.
const nonIotModelFixtures: readonly ModelReferenceDto[] = [
  {
    model_id: 'model-n110',
    code: 'KGR-N110',
    name: 'Kangaroo KG110 (không IoT)',
    industry: 'water_purifier',
    has_hot_tank: false,
    has_cold_tank: false,
    supports_membrane_flush: false,
  },
  {
    model_id: 'model-n120',
    code: 'KGR-N120',
    name: 'Kangaroo KG120 Hot (không IoT)',
    industry: 'water_purifier',
    has_hot_tank: true,
    has_cold_tank: false,
    supports_membrane_flush: false,
  },
];

export const modelFixtures: readonly ModelReferenceDto[] = [
  ...iotModelFixtures,
  ...(nonIotProductsEnabled ? nonIotModelFixtures : []),
];
