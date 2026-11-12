import { PortalBadge } from '@/shared/components/portal';
import { useTranslation } from 'react-i18next';
import {
  ALERT_SEVERITY_TONES,
  type AlertSeverity,
  type AlertStatus,
  type TicketStatus,
} from '../constants/alertEnums';

const statusTone: Record<
  AlertStatus,
  'primary' | 'info' | 'warning' | 'danger' | 'water'
> = {
  new: 'info',
  acknowledged: 'warning',
  unreachable: 'danger',
  ticketed: 'primary',
  declined: 'water',
  closed: 'water',
};

export function AlertSeverityTag({ value }: { value: AlertSeverity }) {
  const { t } = useTranslation('alerts');
  return (
    <PortalBadge tone={ALERT_SEVERITY_TONES[value]}>
      {t(`severity.${value}`)}
    </PortalBadge>
  );
}
export function AlertStatusTag({ value }: { value: AlertStatus }) {
  const { t } = useTranslation('alerts');
  return (
    <PortalBadge tone={statusTone[value]}>{t(`status.${value}`)}</PortalBadge>
  );
}
export function TicketStatusTag({ value }: { value: TicketStatus }) {
  const { t } = useTranslation('alerts');
  return (
    <PortalBadge
      tone={
        value === 'cancelled'
          ? 'danger'
          : value === 'tt7' || value === 'tt8' || value === 'tt9'
            ? 'primary'
            : 'info'
      }
    >
      {t(`ticketStatus.${value}`)}
    </PortalBadge>
  );
}
