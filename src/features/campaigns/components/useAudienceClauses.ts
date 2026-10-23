import { useTranslation } from 'react-i18next';

import type { AudienceConditions } from '../schemas/audienceSchemas';

// Plain-language sentence of the audience conditions, e.g.
// "Khu vực: Hà Nội · Lõi còn: ≤ 30 ngày (thỏa tất cả)". Used by the wizard
// review step and the campaign detail page so both read the same.
export function useAudienceClauses(conditions: AudienceConditions): string[] {
  const { t } = useTranslation('campaigns');
  const lists = [
    { label: t('fields.regions'), values: conditions.regions },
    { label: t('fields.models'), values: conditions.models },
    {
      label: t('fields.warrantyStatuses'),
      values: conditions.warrantyStatuses.map((value) =>
        t(`warranty.${value}`)
      ),
    },
    {
      label: t('fields.usageTypes'),
      values: conditions.usageTypes.map((value) => t(`usageType.${value}`)),
    },
    {
      label: t('fields.firmwareVersions'),
      values: conditions.firmwareVersions,
    },
    {
      label: t('fields.connectivities'),
      values: conditions.connectivities.map((value) =>
        t(`productConnectivity.${value}`, { ns: 'common' })
      ),
    },
  ];
  const ranges = [
    {
      label: t('fields.coreRemainingDays'),
      value: conditions.coreRemainingDays,
      unit: t('unit.days'),
    },
    { label: t('fields.regionTds'), value: conditions.regionTds, unit: 'ppm' },
    {
      label: t('fields.loyaltyPoints'),
      value: conditions.loyaltyPoints,
      unit: t('unit.points'),
    },
  ];
  const clauses = lists
    .filter((item) => item.values.length)
    .map((item) => `${item.label}: ${item.values.join(', ')}`);
  for (const { label, value, unit } of ranges) {
    if (value?.min == null && value?.max == null) continue;
    const bounds =
      value?.min != null && value.max != null
        ? `${value.min}–${value.max}`
        : value?.min != null
          ? `≥ ${value.min}`
          : `≤ ${value?.max}`;
    clauses.push(`${label}: ${bounds} ${unit}`);
  }
  return clauses;
}
