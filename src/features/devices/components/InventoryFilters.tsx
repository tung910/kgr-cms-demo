import { Button, Input, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';

import type { InventoryListFilters } from '../schemas/inventorySchemas';

export interface InventoryFiltersProps {
  filters: InventoryListFilters;
  onChange: (changes: Partial<InventoryListFilters>) => void;
  onReset: () => void;
}

export function InventoryFilters({
  filters,
  onChange,
  onReset,
}: InventoryFiltersProps) {
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
        aria-label={t('inventory.filters.searchAriaLabel')}
        defaultValue={filters.search}
        placeholder={t('inventory.filters.searchPlaceholder')}
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
      <Button className="w-full sm:w-auto" onClick={onReset}>
        {t('filters.reset')}
      </Button>
    </div>
  );
}
