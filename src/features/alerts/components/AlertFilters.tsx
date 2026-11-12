import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, DatePicker, Input, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  ALERT_HANDLER_GROUPS,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
} from '../constants/alertEnums';
import { alertQueries } from '../queries/alertQueries';
import type { AlertListFilters } from '../schemas/alertSchemas';

export function AlertFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: AlertListFilters;
  onChange: (changes: Partial<AlertListFilters>) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation('alerts');
  const options = useQuery(alertQueries.filterOptions());
  const translated = (items: readonly { value: string; labelKey: string }[]) =>
    items.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  return (
    <div className="space-y-3 border-b border-brand-lightgray p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input.Search
          allowClear
          defaultValue={filters.search}
          key={filters.search}
          placeholder={t('filters.search')}
          onSearch={(search) => onChange({ search })}
        />
        <Select
          allowClear
          placeholder={t('filters.severity')}
          value={filters.severity}
          options={translated(ALERT_SEVERITIES)}
          onChange={(severity) => onChange({ severity })}
        />
        <Select
          allowClear
          placeholder={t('filters.status')}
          value={filters.status}
          options={translated(ALERT_STATUSES)}
          onChange={(status) => onChange({ status })}
        />
        <Select
          allowClear
          placeholder={t('filters.group')}
          value={filters.group}
          options={translated(ALERT_HANDLER_GROUPS)}
          onChange={(group) => onChange({ group })}
        />
        <Select
          allowClear
          loading={options.isFetching}
          placeholder={t('filters.region')}
          value={filters.region}
          options={options.data?.regions.map((value) => ({
            value,
            label: value,
          }))}
          onChange={(region) => onChange({ region })}
        />
        <Select
          allowClear
          loading={options.isFetching}
          placeholder={t('filters.model')}
          value={filters.model}
          options={options.data?.models.map((value) => ({
            value,
            label: value,
          }))}
          onChange={(model) => onChange({ model })}
        />
        <DatePicker.RangePicker
          className="w-full"
          value={
            filters.dateFrom && filters.dateTo
              ? [dayjs(filters.dateFrom), dayjs(filters.dateTo)]
              : null
          }
          onChange={(range) =>
            onChange({
              dateFrom: range?.[0]?.format('YYYY-MM-DD'),
              dateTo: range?.[1]?.format('YYYY-MM-DD'),
            })
          }
        />
        <Button icon={<ReloadOutlined />} onClick={onReset}>
          {t('filters.reset')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-5">
        {(['mine', 'overdue', 'includeClosed'] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Switch
              size="small"
              checked={Boolean(filters[key])}
              onChange={(checked) => onChange({ [key]: checked || undefined })}
            />
            {t(`filters.${key}`)}
          </label>
        ))}
      </div>
    </div>
  );
}
