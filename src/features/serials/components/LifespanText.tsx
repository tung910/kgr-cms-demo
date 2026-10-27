import { useTranslation } from 'react-i18next';

export interface LifespanTextProps {
  months: number;
  hours: number;
}

// "12 tháng · 250 h" — a core expires on whichever limit comes first.
export function LifespanText({ months, hours }: LifespanTextProps) {
  const { t, i18n } = useTranslation('serials');
  return (
    <>
      {t('coreLifecycle.lifeMonthsHours', {
        months,
        hours: new Intl.NumberFormat(i18n.resolvedLanguage).format(hours),
      })}
    </>
  );
}
