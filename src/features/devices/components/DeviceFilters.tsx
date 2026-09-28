import { Button, Input, Segmented, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';
import { CONNECTION_STATUSES } from '@/shared/constants/connectionStatus';

import type { DeviceListFilters, DeviceStatus } from '../schemas/deviceSchemas';

const regionOptions = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Hồ Chí Minh'].map(
  (value) => ({ value, label: value })
);

export interface DeviceFiltersProps {
  filters: DeviceListFilters;
  onChange: (changes: Partial<DeviceListFilters>) => void;
  onReset: () => void;
}

export function DeviceFilters({
  filters,
  onChange,
  onReset,
}: DeviceFiltersProps) {
  const { t } = useTranslation('devices');
  const models = useQuery(modelReferenceQueries.list());
  const modelOptions = models.data?.map((model) => ({
    value: model.code,
    label: model.code,
  }));

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
      <Input.Search
        key={filters.search}
        allowClear
        aria-label={t('filters.searchAriaLabel')}
        defaultValue={filters.search}
        placeholder={t('filters.searchPlaceholder')}
        className="w-full sm:min-w-56 sm:flex-1"
        onSearch={(search) => onChange({ search })}
      />
      <Select
        allowClear
        aria-label={t('filters.modelAriaLabel')}
        placeholder={t('filters.modelPlaceholder')}
        value={filters.model}
        options={modelOptions}
        loading={models.isFetching}
        className="w-full sm:w-40"
        onChange={(model) => onChange({ model })}
      />
      <Select
        allowClear
        aria-label={t('filters.regionAriaLabel')}
        placeholder={t('filters.regionPlaceholder')}
        value={filters.region}
        options={regionOptions}
        className="w-full sm:w-44"
        onChange={(region) => onChange({ region })}
      />
      <Segmented<DeviceStatus | 'all'>
        aria-label={t('filters.statusAriaLabel')}
        value={filters.status ?? 'all'}
        options={[
          { value: 'all', label: t('filters.statusAll') },
          ...CONNECTION_STATUSES.map(({ value, labelKey }) => ({
            value,
            label: t(labelKey, { ns: 'common' }),
          })),
        ]}
        onChange={(status) =>
          onChange({ status: status === 'all' ? undefined : status })
        }
      />
      <Button className="w-full sm:w-auto" onClick={onReset}>
        {t('filters.reset')}
      </Button>
    </div>
  );
}
