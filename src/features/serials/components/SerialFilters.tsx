import { useQuery } from '@tanstack/react-query';
import { Button, Input, Segmented, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';

import { serialQueries } from '../queries/serialQueries';
import type { SerialListFilters, SerialStatus } from '../schemas/serialSchemas';

export interface SerialFiltersProps {
  filters: SerialListFilters;
  onChange: (changes: Partial<SerialListFilters>) => void;
  onReset: () => void;
}

export function SerialFilters({
  filters,
  onChange,
  onReset,
}: SerialFiltersProps) {
  const { t } = useTranslation('serials');
  const models = useQuery(modelReferenceQueries.list());
  const batches = useQuery(serialQueries.batches());

  const statusOptions: Array<{ value: SerialStatus; label: string }> = [
    { value: 'unused', label: t('status.unused') },
    { value: 'used', label: t('status.used') },
    { value: 'recalled', label: t('status.recalled') },
  ];

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
        value={filters.modelCode}
        loading={models.isFetching}
        options={models.data?.map((model) => ({
          value: model.code,
          label: model.code,
        }))}
        className="w-full sm:w-44"
        onChange={(modelCode) => onChange({ modelCode })}
      />
      <Select
        allowClear
        aria-label={t('filters.batchAriaLabel')}
        placeholder={t('filters.batchPlaceholder')}
        value={filters.batchId}
        loading={batches.isFetching}
        options={batches.data?.map((batch) => ({
          value: batch.id,
          label: batch.id,
        }))}
        className="w-full sm:w-44"
        onChange={(batchId) => onChange({ batchId })}
      />
      <Segmented<SerialStatus | 'all'>
        aria-label={t('filters.statusAriaLabel')}
        value={filters.status ?? 'all'}
        options={[
          { value: 'all', label: t('filters.statusAll') },
          ...statusOptions,
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
