import { Button, Input, Select, Tag } from 'antd';
import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import {
  BILLING_TYPES,
  PACKAGE_STATUSES,
  SERVICE_PACKAGE_GROUPS,
} from '../constants/servicePackage';
import type { ServicePackageListFilters } from '../schemas/servicePackageSchemas';

export interface ServicePackageFiltersProps {
  filters: ServicePackageListFilters;
  onChange: (changes: Partial<ServicePackageListFilters>) => void;
  onReset: () => void;
}

export function ServicePackageFilters({
  filters,
  onChange,
  onReset,
}: ServicePackageFiltersProps) {
  const { t } = useTranslation('servicePackages');

  const groupOptions = SERVICE_PACKAGE_GROUPS.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));
  const billingOptions = BILLING_TYPES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));

  const groupLabel = (value: string) =>
    groupOptions.find((option) => option.value === value)?.label ?? value;
  const billingLabel = (value: string) =>
    billingOptions.find((option) => option.value === value)?.label ?? value;

  const hasAnyFilterActive =
    Boolean(filters.search) ||
    Boolean(filters.group) ||
    Boolean(filters.billingType) ||
    Boolean(filters.status);

  return (
    <div className="space-y-3 border-b border-brand-lightgray p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="w-full flex-1 min-w-[240px]">
          <Input.Search
            key={filters.search}
            allowClear
            aria-label={t('filters.searchAriaLabel')}
            defaultValue={filters.search}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full"
            onSearch={(search) => onChange({ search })}
          />
        </div>

        <div className="w-full sm:w-52">
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.groupLabel')}
          </label>
          <Select
            allowClear
            placeholder={t('filters.groupPlaceholder')}
            value={filters.group}
            options={groupOptions}
            className="w-full"
            onChange={(group) => onChange({ group })}
          />
        </div>

        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.billingTypeLabel')}
          </label>
          <Select
            allowClear
            placeholder={t('filters.billingTypePlaceholder')}
            value={filters.billingType}
            options={billingOptions}
            className="w-full"
            onChange={(billingType) => onChange({ billingType })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-brand-ink">
            {t('filters.statusLabel')}
          </span>
          <div className="inline-flex rounded-full bg-brand-canvas p-1">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !filters.status
                  ? 'bg-white font-semibold text-brand-ink shadow-sm'
                  : 'text-brand-gray hover:text-brand-ink'
              }`}
              onClick={() => onChange({ status: undefined })}
            >
              {t('filters.statusAll')}
            </button>
            {PACKAGE_STATUSES.map(({ value, labelKey }) => {
              const isSelected = filters.status === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-white font-semibold text-brand-ink shadow-sm'
                      : 'text-brand-gray hover:text-brand-ink'
                  }`}
                  onClick={() => onChange({ status: value })}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={onReset}
          className="inline-flex items-center"
        >
          {t('filters.reset')}
        </Button>
      </div>

      {hasAnyFilterActive ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {filters.search ? (
            <Tag
              closable
              onClose={() => onChange({ search: '' })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.search', { value: filters.search })}
            </Tag>
          ) : null}
          {filters.group ? (
            <Tag
              closable
              onClose={() => onChange({ group: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.group', { value: groupLabel(filters.group) })}
            </Tag>
          ) : null}
          {filters.billingType ? (
            <Tag
              closable
              onClose={() => onChange({ billingType: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.billingType', {
                value: billingLabel(filters.billingType),
              })}
            </Tag>
          ) : null}
          {filters.status ? (
            <Tag
              closable
              onClose={() => onChange({ status: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.status', {
                value: t(`statuses.${filters.status}`),
              })}
            </Tag>
          ) : null}
          <Button
            type="link"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={onReset}
            className="text-xs text-brand-orange hover:text-brand-orange/80"
          >
            {t('filters.clearAll')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
