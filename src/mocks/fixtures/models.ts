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

export const modelFixtures: readonly ModelReferenceDto[] = [
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
