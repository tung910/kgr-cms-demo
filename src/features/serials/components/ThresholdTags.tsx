import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  CORE_CRITICAL_PERCENT,
  CORE_WARNING_PERCENT,
  warningThresholds,
} from '../utils/coreLifespan';

export interface ThresholdTagsProps {
  lifespan: { months: number; hours: number };
}

// Yellow / red app countdown thresholds (fixed system defaults), as the
// remaining hours and months of the given lifespan.
export function ThresholdTags({ lifespan }: ThresholdTagsProps) {
  const { t, i18n } = useTranslation('serials');
  const values = warningThresholds(lifespan);
  const number = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage).format(value);
  return (
    <div className="flex flex-col items-start gap-1">
      <Tag color="gold" className="m-0">
        {t('thresholds.warning', {
          percent: CORE_WARNING_PERCENT,
          hours: number(values.warningHours),
          months: number(values.warningMonths),
        })}
      </Tag>
      <Tag color="red" className="m-0">
        {t('thresholds.critical', {
          percent: CORE_CRITICAL_PERCENT,
          hours: number(values.criticalHours),
          months: number(values.criticalMonths),
        })}
      </Tag>
    </div>
  );
}
