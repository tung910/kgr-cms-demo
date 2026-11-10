import { Descriptions } from 'antd';
import { useTranslation } from 'react-i18next';
import { PortalCard } from '@/shared/components/portal';
import type { AlertDetail } from '../schemas/alertSchemas';
import { TicketStatusTag } from './AlertStatusTag';

export function AlertTicketBlock({ alert }: { alert: AlertDetail }) {
  const { t } = useTranslation('alerts');
  if (!alert.ticket) return null;
  const detail = alert.ticketDetail;
  const items = [
    { key: 'code', label: t('ticket.code'), children: alert.ticket.code },
    {
      key: 'status',
      label: t('ticket.status'),
      children: <TicketStatusTag value={alert.ticket.status} />,
    },
    {
      key: 'assignment',
      label: t('ticket.assignment'),
      children: t(`assignment.${alert.ticket.assignmentState}`),
    },
    ...(detail
      ? [
          {
            key: 'service',
            label: t('ticket.serviceType'),
            children: t(`serviceType.${detail.serviceType}`),
          },
          ...(detail.technician
            ? [
                {
                  key: 'technician',
                  label: t('ticket.technician'),
                  children: detail.technician.name,
                },
              ]
            : []),
          ...(detail.appointmentDate
            ? [
                {
                  key: 'appointment',
                  label: t('ticket.appointment'),
                  children: `${detail.appointmentDate} · ${detail.appointmentSlot ?? ''}`,
                },
              ]
            : []),
          ...(detail.contactName
            ? [
                {
                  key: 'contact',
                  label: t('ticket.contact'),
                  children: `${detail.contactName} · ${detail.contactPhone ?? ''}`,
                },
              ]
            : []),
          ...(detail.address
            ? [
                {
                  key: 'address',
                  label: t('detail.address'),
                  children: detail.address,
                },
              ]
            : []),
          ...(detail.technicianNote
            ? [
                {
                  key: 'note',
                  label: t('ticket.note'),
                  children: detail.technicianNote,
                },
              ]
            : []),
        ]
      : []),
  ];
  return (
    <PortalCard>
      <h3 className="mb-4 text-base font-semibold">{t('ticket.title')}</h3>
      <Descriptions size="small" column={1} items={items} />
    </PortalCard>
  );
}
