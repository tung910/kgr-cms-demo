import type { TFunction } from 'i18next';

import {
  DISTRIBUTION_REGION_GROUPS,
  DISTRIBUTION_REGIONS,
} from '@/shared/constants/distributionRegion';

// Grouped Select options: zones, special water zones, provinces.
export function regionSelectOptions(t: TFunction) {
  return DISTRIBUTION_REGION_GROUPS.map((group) => ({
    label: t(group.labelKey, { ns: 'common' }),
    options: DISTRIBUTION_REGIONS.filter(
      (region) => region.group === group.value
    ).map((region) => ({
      value: region.value,
      label: t(region.labelKey, { ns: 'common' }),
    })),
  }));
}
