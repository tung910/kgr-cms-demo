import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { CAMPAIGN_KINDS } from '../constants/campaignEnums';
import { CAMPAIGN_STATUSES } from '../constants/campaignStatus';
import type { CampaignListFilters } from '../schemas/campaignSchemas';

export interface CampaignFiltersProps {
  filters: CampaignListFilters;
  onChange: (changes: Partial<CampaignListFilters>) => void;
  onReset: () => void;
}

export function CampaignFilters({
  filters,
  onChange,
  onReset,
}: CampaignFiltersProps) {
  const { t } = useTranslation('campaigns');

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
        aria-label={t('filters.statusAriaLabel')}
        placeholder={t('filters.statusPlaceholder')}
        value={filters.status}
        className="w-full sm:w-44"
        onChange={(status) => onChange({ status })}
        options={CAMPAIGN_STATUSES.map(({ value, labelKey }) => ({
          value,
          label: t(labelKey),
        }))}
      />
      <Select
        allowClear
        aria-label={t('filters.kindAriaLabel')}
        placeholder={t('filters.kindPlaceholder')}
        value={filters.kind}
        className="w-full sm:w-40"
        onChange={(kind) => onChange({ kind })}
        options={CAMPAIGN_KINDS.map(({ value, labelKey }) => ({
          value,
          label: t(labelKey),
        }))}
      />
      <Button className="w-full sm:w-auto" onClick={onReset}>
        {t('filters.reset')}
      </Button>
    </div>
  );
}
