import { Segmented, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MarkerStatus } from '../mocks/mapMockData';

export interface MapFiltersValue {
  status?: MarkerStatus;
  region?: string;
}

export interface MapFiltersProps {
  value: MapFiltersValue;
  regions: string[];
  onChange: (changes: Partial<MapFiltersValue>) => void;
}

export function MapFilters({ value, regions, onChange }: MapFiltersProps) {
  const { t } = useTranslation('maps');

  const statusOptions: Array<{ value: MarkerStatus; label: string }> = [
    { value: 'online', label: t('status.online') },
    { value: 'offline', label: t('status.offline') },
    { value: 'alert', label: t('status.alert') },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
      <Segmented<MarkerStatus | 'all'>
        aria-label={t('filters.statusAriaLabel')}
        value={value.status ?? 'all'}
        options={[{ value: 'all', label: t('filters.all') }, ...statusOptions]}
        onChange={(status) =>
          onChange({ status: status === 'all' ? undefined : status })
        }
      />
      <Select
        allowClear
        aria-label={t('filters.regionAriaLabel')}
        placeholder={t('filters.regionPlaceholder')}
        className="w-full sm:w-48"
        value={value.region}
        options={regions.map((region) => ({ value: region, label: region }))}
        onChange={(region) => onChange({ region })}
      />
    </div>
  );
}
