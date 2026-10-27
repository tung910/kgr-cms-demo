import { Button, DatePicker, Segmented, Select } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import {
  MAP_REGION_STATUSES,
  type MapRegionStatus,
} from '@/shared/constants/mapRegionStatus';

import type { MapFilters as MapFiltersValue } from '../schemas/mapSchemas';

const DATE_FORMAT = 'YYYY-MM-DD';

export interface MapFiltersProps {
  value: MapFiltersValue;
  models: string[];
  onChange: (changes: Partial<MapFiltersValue>) => void;
}

export function MapFilters({ value, models, onChange }: MapFiltersProps) {
  const { t } = useTranslation('maps');
  const hasFilters = Boolean(
    value.model || value.status || value.dateFrom || value.dateTo
  );

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
      <Segmented<MapRegionStatus | 'all'>
        aria-label={t('filters.statusAriaLabel')}
        value={value.status ?? 'all'}
        options={[
          { value: 'all', label: t('filters.all') },
          ...MAP_REGION_STATUSES.map(({ value: status, labelKey }) => ({
            value: status,
            label: t(labelKey, { ns: 'common' }),
          })),
        ]}
        onChange={(status) =>
          onChange({ status: status === 'all' ? undefined : status })
        }
      />
      <Select
        allowClear
        aria-label={t('filters.modelAriaLabel')}
        placeholder={t('filters.model')}
        className="w-full sm:w-48"
        value={value.model}
        options={models.map((model) => ({ value: model, label: model }))}
        onChange={(model) => onChange({ model })}
      />
      <DatePicker.RangePicker
        aria-label={t('filters.dateRangeAriaLabel')}
        className="w-full sm:w-72"
        value={[
          value.dateFrom ? dayjs(value.dateFrom) : null,
          value.dateTo ? dayjs(value.dateTo) : null,
        ]}
        onChange={(range) =>
          onChange({
            dateFrom: range?.[0]?.format(DATE_FORMAT),
            dateTo: range?.[1]?.format(DATE_FORMAT),
          })
        }
      />
      {hasFilters ? (
        <Button
          type="link"
          onClick={() =>
            onChange({
              model: undefined,
              status: undefined,
              dateFrom: undefined,
              dateTo: undefined,
            })
          }
        >
          {t('filters.clear')}
        </Button>
      ) : null}
    </div>
  );
}
