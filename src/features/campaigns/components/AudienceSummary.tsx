import { useTranslation } from 'react-i18next';

import type { AudienceConditions } from '../schemas/audienceSchemas';

export function AudienceSummary({
  conditions,
}: {
  conditions: AudienceConditions;
}) {
  const { t } = useTranslation('campaigns');
  const lists = [
    { label: t('fields.regions'), values: conditions.regions },
    { label: t('fields.models'), values: conditions.models },
    {
      label: t('fields.firmwareVersions'),
      values: conditions.firmwareVersions,
    },
    {
      label: t('fields.warrantyStatuses'),
      values: conditions.warrantyStatuses.map((value) =>
        t(`warranty.${value}`)
      ),
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
      unit: t('audienceHelp.days'),
    },
    {
      label: t('fields.loyaltyPoints'),
      value: conditions.loyaltyPoints,
      unit: t('audienceHelp.points'),
    },
    { label: t('fields.regionTds'), value: conditions.regionTds, unit: 'ppm' },
    {
      label: t('fields.tenureDays'),
      value: conditions.tenureDays,
      unit: t('audienceHelp.days'),
    },
  ];
  const clauses = lists
    .filter((item) => item.values.length)
    .map(
      (item) => `${item.label}: (${item.values.join(t('audienceHelp.or'))})`
    );
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
  return (
    <section
      aria-label={t('audienceHelp.summary')}
      className="mt-4 rounded-lg border border-[#E5E6E6] p-4"
    >
      <h3 className="mb-2 mt-0 text-sm font-semibold">
        {t('audienceHelp.summary')}
      </h3>
      <p className="m-0 break-words text-sm">
        {clauses.length
          ? clauses.join(t('audienceHelp.and'))
          : t('audienceHelp.all')}
      </p>
    </section>
  );
}
