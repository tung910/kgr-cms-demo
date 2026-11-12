import { Timeline } from 'antd';
import { useTranslation } from 'react-i18next';
import { PortalCard } from '@/shared/components/portal';
import { formatDateTimeInLocale } from '@/shared/lib/format';
import type { AlertDetail } from '../schemas/alertSchemas';

export function AlertHistoryTimeline({ alert }: { alert: AlertDetail }) {
  const { t, i18n } = useTranslation('alerts');
  return (
    <PortalCard>
      <h3 className="mb-4 text-base font-semibold">{t('detail.history')}</h3>
      {alert.history.length ? (
        <Timeline
          items={alert.history.map((entry) => ({
            children: (
              <div>
                <div className="font-medium">
                  {t(`history.${entry.action}`)}
                </div>
                <div className="text-xs text-brand-gray">
                  {entry.actorName} ·{' '}
                  {formatDateTimeInLocale(
                    entry.occurredAt,
                    i18n.resolvedLanguage
                  )}
                </div>
                {entry.fromStatus && entry.toStatus ? (
                  <div className="mt-1 text-xs">
                    {t(`status.${entry.fromStatus}`)} →{' '}
                    {t(`status.${entry.toStatus}`)}
                  </div>
                ) : null}
                {entry.note ? (
                  <div className="mt-1 text-sm">{entry.note}</div>
                ) : null}
              </div>
            ),
          }))}
        />
      ) : (
        <p className="text-sm text-brand-gray">{t('detail.noHistory')}</p>
      )}
    </PortalCard>
  );
}
