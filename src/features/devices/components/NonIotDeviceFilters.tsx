import { Button, Input, Segmented, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import type { DeviceWarrantyStatus } from '../schemas/deviceSchemas';
import type { NonIotDeviceListFilters } from '../schemas/nonIotDeviceSchemas';

// Same regions as the in-use filter bar.
const regionOptions = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Hồ Chí Minh'].map(
  (value) => ({ value, label: value })
);
const warrantyFilterValues = [
  'active',
  'expiring',
  'expired',
] as const satisfies readonly DeviceWarrantyStatus[];

export interface NonIotDeviceFiltersProps {
  filters: NonIotDeviceListFilters;
  onChange: (changes: Partial<NonIotDeviceListFilters>) => void;
  onReset: () => void;
}

export function NonIotDeviceFilters({
  filters,
  onChange,
  onReset,
}: NonIotDeviceFiltersProps) {
  const { t } = useTranslation('devices');

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
      <Input.Search
        key={filters.search}
        allowClear
        aria-label={t('filters.searchAriaLabel')}
        defaultValue={filters.search}
        placeholder={t('nonIot.filters.searchPlaceholder')}
        className="w-full sm:min-w-56 sm:flex-1"
        onSearch={(search) => onChange({ search })}
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
      {/* Non-IoT units are followed up by warranty, not connection state. */}
      <div className="min-w-0 max-w-full overflow-x-auto">
        <Segmented<(typeof warrantyFilterValues)[number] | 'all'>
          aria-label={t('nonIot.filters.warrantyAriaLabel')}
          value={filters.warrantyStatus ?? 'all'}
          options={[
            { value: 'all', label: t('filters.statusAll') },
            ...warrantyFilterValues.map((value) => ({
              value,
              label: t('warrantyStatus.' + value),
            })),
          ]}
          onChange={(value) =>
            onChange({ warrantyStatus: value === 'all' ? undefined : value })
          }
        />
      </div>
      <Button className="w-full sm:w-auto" onClick={onReset}>
        {t('filters.reset')}
      </Button>
    </div>
  );
}
