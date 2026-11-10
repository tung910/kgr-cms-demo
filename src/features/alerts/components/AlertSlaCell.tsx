import { useTranslation } from 'react-i18next';
import type { AlertSla } from '../schemas/alertSchemas';
import { getSlaDurationMs, getSlaState } from '../utils/alertSla';

function Duration({ milliseconds }: { milliseconds: number }) {
  const { t } = useTranslation('alerts');
  const minutes = Math.floor(Math.abs(milliseconds) / 60_000);
  if (minutes < 1) return t('sla.lessThanMinute');
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0
    ? t('sla.hoursMinutes', { hours, minutes: remainder })
    : t('sla.minutes', { minutes });
}

export function AlertSlaCell({
  sla,
  raisedAt,
  now,
}: {
  sla: AlertSla;
  raisedAt: string;
  now: number;
}) {
  const { t } = useTranslation('alerts');
  const state = getSlaState(sla, now);
  const duration = getSlaDurationMs(sla, raisedAt, now);
  if (state === 'none' || duration === null) return <span>—</span>;
  const tone =
    state === 'overdue' || state === 'late'
      ? 'text-red-600'
      : state === 'warning'
        ? 'text-orange-600'
        : state === 'met'
          ? 'text-green-700'
          : '';
  const label =
    state === 'overdue'
      ? t('sla.overdue')
      : state === 'met'
        ? t('sla.met')
        : state === 'late'
          ? t('sla.late')
          : null;
  return (
    <span className={`whitespace-nowrap text-xs font-medium ${tone}`}>
      {label ? <>{label} · </> : null}
      <Duration milliseconds={duration} />
    </span>
  );
}
