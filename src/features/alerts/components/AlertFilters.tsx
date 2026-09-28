import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertSeverity } from '../mocks/alertMockData';

export interface AlertFiltersValue {
  severity?: AlertSeverity;
  showResolved: boolean;
}

export interface AlertFiltersProps {
  value: AlertFiltersValue;
  onChange: (changes: Partial<AlertFiltersValue>) => void;
}

export function AlertFilters({ value, onChange }: AlertFiltersProps) {
  const { t } = useTranslation('alerts');

  const severityOptions: Array<{ value: AlertSeverity; label: string }> = [
    { value: 'high', label: t('severity.high') },
    { value: 'medium', label: t('severity.medium') },
    { value: 'low', label: t('severity.low') },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
      <Segmented<AlertSeverity | 'all'>
        aria-label={t('filters.severityLabel')}
        value={value.severity ?? 'all'}
        options={[
          { value: 'all', label: t('filters.all') },
          ...severityOptions,
        ]}
        onChange={(severity) =>
          onChange({ severity: severity === 'all' ? undefined : severity })
        }
      />
      <Segmented<'hide' | 'show'>
        aria-label={t('filters.resolvedVisibilityLabel')}
        value={value.showResolved ? 'show' : 'hide'}
        options={[
          { value: 'hide', label: t('filters.open') },
          { value: 'show', label: t('filters.includeResolved') },
        ]}
        onChange={(next) => onChange({ showResolved: next === 'show' })}
      />
    </div>
  );
}
