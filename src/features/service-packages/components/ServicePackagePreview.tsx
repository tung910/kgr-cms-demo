import { Descriptions } from 'antd';
import { useTranslation } from 'react-i18next';

import type { ModelReference } from '@/core/reference/modelReferenceApi';
import { formatDate } from '@/shared/lib/format';

import type {
  ServicePackage,
  ServicePackageDraftInput,
} from '../schemas/servicePackageSchemas';
import {
  computeEntitlementQuota,
  getEntitlementKind,
} from '../utils/entitlementRules';

export function ServicePackagePreview({
  input,
  models,
  packages,
}: {
  input: ServicePackageDraftInput;
  models: ModelReference[];
  packages: ServicePackage[];
}) {
  const { t, i18n } = useTranslation('servicePackages');
  const missing = t('create.notDeclared');
  const formatValue = (value: unknown): string => {
    if (typeof value === 'boolean')
      return t(value ? 'create.yes' : 'create.no');
    if (Array.isArray(value)) return value.map(formatValue).join('; ');
    if (typeof value === 'object' && value !== null) {
      if ('code' in value && 'name' in value)
        return `${value.code} — ${value.name}`;
      if ('id' in value && 'quantity' in value && 'months' in value) {
        const target = packages.find((item) => item.id === value.id);
        return `${target?.name ?? value.id} · ${t('create.bundlePart', { quantity: value.quantity, months: value.months })}`;
      }
      return missing;
    }
    return String(value ?? missing);
  };
  const list = (items: string[]) =>
    items.length ? (
      <ul className="m-0 pl-5">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    ) : (
      missing
    );
  return (
    <div className="space-y-5 break-words">
      <div>
        <h3 className="m-0 text-xl font-semibold">{input.name}</h3>
        <p className="mt-1 text-slate-500">
          {input.code} · {t(`types.${input.serviceTypeCode}`)}
        </p>
        <p>{input.purpose}</p>
        {input.description ? <p>{input.description}</p> : null}
      </div>
      <Descriptions
        column={1}
        size="small"
        items={[
          {
            key: 'included',
            label: t('create.fields.included_items'),
            children: list(input.includedItems),
          },
          {
            key: 'excluded',
            label: t('create.fields.excluded_items'),
            children: list(input.excludedItems),
          },
          {
            key: 'eligible',
            label: t('create.fields.eligibility_description'),
            children: input.eligibilityDescription,
          },
          {
            key: 'models',
            label: t('create.modelTitle'),
            children:
              input.modelScope === 'all'
                ? t('create.models.all')
                : input.eligibleModelIds
                    .map((id) => {
                      const model = models.find((item) => item.id === id);
                      return model ? `${model.code} — ${model.name}` : id;
                    })
                    .join('; '),
          },
          {
            key: 'price',
            label: t('form.priceLabel'),
            children:
              input.pricingMode === 'quotation'
                ? t('create.pricing.quotation')
                : input.price === 0
                  ? t('create.pricing.free_or_included')
                  : new Intl.NumberFormat(i18n.language, {
                      style: 'currency',
                      currency: 'VND',
                    }).format(input.price ?? 0),
          },
          {
            key: 'pricing',
            label: t('create.fields.pricing_description'),
            children: input.pricingDescription ?? missing,
          },
          {
            key: 'extra',
            label: t('create.fields.additional_cost_description'),
            children: input.additionalCostDescription ?? missing,
          },
          {
            key: 'billing',
            label: t('form.billingTypeLabel'),
            children: t(`billingTypes.${input.billingType}`),
          },
          {
            key: 'period',
            label: t('form.billingPeriodLabel'),
            children: input.billingPeriodMonths
              ? t('table.term.months', { count: input.billingPeriodMonths })
              : '—',
          },
          {
            key: 'term',
            label: t('form.termLabel'),
            children: input.termMonths
              ? t('table.term.months', { count: input.termMonths })
              : t('create.notApplicable'),
          },
          {
            key: 'quota',
            label: t('autoAttach.quotaResultLabel'),
            children: (() => {
              const kind = getEntitlementKind(input.serviceTypeCode);
              if (kind === null || kind === 'time_only')
                return t('autoAttach.quotaNotApplicable');
              const quota = computeEntitlementQuota(
                input.configuration,
                input.termMonths,
                input.quotaMode,
                input.customQuota
              );
              return t('autoAttach.quotaResultValue', {
                count: quota ?? 0,
                mode: t(`autoAttach.quotaModes.${input.quotaMode}`),
              });
            })(),
          },
          {
            key: 'autoAttach',
            label: t('autoAttach.sectionTitle'),
            children: input.autoAttach
              ? t('autoAttach.fromDate', {
                  date: formatDate(input.autoAttachFrom),
                })
              : t('autoAttach.off'),
          },
          ...Object.entries(input.configuration)
            .filter(([key]) => key !== 'type')
            .map(([key, value]) => ({
              key,
              label: t(`create.fields.${key}`),
              children:
                key === 'delivery'
                  ? t(`create.delivery.${value}`)
                  : formatValue(value),
            })),
        ]}
      />
    </div>
  );
}
