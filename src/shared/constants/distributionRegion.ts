// Distribution regions a QR batch can be shipped to (9.2): the four spec
// zones and special water zones, in display order.
// `labelKey` and the group keys live in the `common` namespace; translate
// with `t(labelKey, { ns: 'common' })`.
export const DISTRIBUTION_REGION_GROUPS = [
  { value: 'zone', labelKey: 'distributionRegionGroup.zone' },
  { value: 'water_zone', labelKey: 'distributionRegionGroup.water_zone' },
] as const;

export type DistributionRegionGroup =
  (typeof DISTRIBUTION_REGION_GROUPS)[number]['value'];

export const DISTRIBUTION_REGIONS = [
  { value: 'north', group: 'zone', labelKey: 'distributionRegion.north' },
  { value: 'central', group: 'zone', labelKey: 'distributionRegion.central' },
  { value: 'south', group: 'zone', labelKey: 'distributionRegion.south' },
  {
    value: 'nationwide',
    group: 'zone',
    labelKey: 'distributionRegion.nationwide',
  },
  {
    value: 'mekong_alum',
    group: 'water_zone',
    labelKey: 'distributionRegion.mekong_alum',
  },
] as const satisfies ReadonlyArray<{
  value: string;
  group: DistributionRegionGroup;
  labelKey: string;
}>;

export type DistributionRegion = (typeof DISTRIBUTION_REGIONS)[number]['value'];

export const DISTRIBUTION_REGION_VALUES = DISTRIBUTION_REGIONS.map(
  ({ value }) => value
) as [DistributionRegion, ...DistributionRegion[]];

export const DISTRIBUTION_REGION_LABEL_KEYS = Object.fromEntries(
  DISTRIBUTION_REGIONS.map(({ value, labelKey }) => [value, labelKey])
) as Record<DistributionRegion, string>;
