import { Link, useNavigate } from '@tanstack/react-router';
import { Descriptions, Progress } from 'antd';
import { useTranslation } from 'react-i18next';
import { PortalCard } from '@/shared/components/portal';
import { formatDateTimeInLocale } from '@/shared/lib/format';
import type { AlertDetail } from '../schemas/alertSchemas';
import { useNow } from '../utils/useNow';
import { AlertSlaCell } from './AlertSlaCell';
import { AlertSeverityTag, AlertStatusTag } from './AlertStatusTag';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PortalCard>
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </PortalCard>
  );
}
export function AlertSummaryBlock({ alert }: { alert: AlertDetail }) {
  const { t, i18n } = useTranslation('alerts');
  const now = useNow();
  return (
    <Section title={t('detail.summary')}>
      <Descriptions
        size="small"
        column={2}
        items={[
          { key: 'name', label: t('table.name'), children: alert.name },
          {
            key: 'code',
            label: t('table.errorCode'),
            children: alert.errorCode,
          },
          {
            key: 'severity',
            label: t('table.severity'),
            children: <AlertSeverityTag value={alert.severity} />,
          },
          {
            key: 'status',
            label: t('table.status'),
            children: <AlertStatusTag value={alert.status} />,
          },
          {
            key: 'group',
            label: t('filters.group'),
            children: t(`group.${alert.handlerGroup}`),
          },
          {
            key: 'raised',
            label: t('detail.raisedAt'),
            children: formatDateTimeInLocale(
              alert.raisedAt,
              i18n.resolvedLanguage
            ),
          },
          {
            key: 'seen',
            label: t('detail.lastSeenAt'),
            children: formatDateTimeInLocale(
              alert.lastSeenAt,
              i18n.resolvedLanguage
            ),
          },
          {
            key: 'occurrences',
            label: t('detail.occurrenceCount'),
            children: alert.occurrenceCount,
          },
          {
            key: 'handler',
            label: t('table.handler'),
            children: alert.handler?.name ?? '—',
          },
          {
            key: 'sla',
            label: t('table.sla'),
            children: (
              <AlertSlaCell
                sla={alert.sla}
                raisedAt={alert.raisedAt}
                now={now}
              />
            ),
          },
          ...(alert.contactAttempts > 0
            ? [
                {
                  key: 'calls',
                  label: t('detail.contactAttempts'),
                  children: alert.contactAttempts,
                },
              ]
            : []),
          ...(alert.declineReason
            ? [
                {
                  key: 'decline',
                  label: t('detail.declineReason'),
                  children: t(`declineReason.${alert.declineReason}`),
                },
              ]
            : []),
          ...(alert.closeResult
            ? [
                {
                  key: 'close',
                  label: t('detail.closeResult'),
                  children:
                    alert.closeResult.note ??
                    t(`closeResult.${alert.closeResult.kind}`),
                },
              ]
            : []),
        ]}
      />
    </Section>
  );
}
export function AlertDeviceBlock({ alert }: { alert: AlertDetail }) {
  const { t } = useTranslation('alerts');
  return (
    <Section title={t('detail.device')}>
      <Descriptions
        size="small"
        column={2}
        items={[
          {
            key: 'serial',
            label: t('table.deviceId'),
            children: (
              <Link
                to="/devices/$deviceId"
                params={{ deviceId: alert.deviceId }}
              >
                {alert.deviceId}
              </Link>
            ),
          },
          { key: 'model', label: t('table.model'), children: alert.modelName },
          { key: 'region', label: t('table.region'), children: alert.region },
          {
            key: 'connection',
            label: t('detail.connection'),
            children: alert.device.connectionStatus
              ? t(`detail.connectionStatus.${alert.device.connectionStatus}`)
              : '—',
          },
          {
            key: 'warranty',
            label: t('detail.warranty'),
            children: t(`detail.warrantyStatus.${alert.device.warrantyStatus}`),
          },
        ]}
      />
      <div className="mt-4 space-y-3">
        {alert.device.cores.map((core) => (
          <div
            key={core.position}
            className={core.overThreshold ? 'rounded-lg bg-red-50 p-3' : ''}
          >
            <div className="mb-1 flex justify-between text-sm">
              <span>{core.coreName}</span>
              <span>{core.usedPercent}%</span>
            </div>
            <Progress
              percent={core.usedPercent}
              status={core.overThreshold ? 'exception' : 'normal'}
              showInfo={false}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
export function AlertCustomerBlock({ alert }: { alert: AlertDetail }) {
  const { t } = useTranslation('alerts');
  if (!alert.customer) return null;
  return (
    <Section title={t('detail.customer')}>
      <Descriptions
        size="small"
        column={1}
        items={[
          {
            key: 'name',
            label: t('detail.customerName'),
            children: alert.customer.name,
          },
          {
            key: 'phone',
            label: t('detail.phone'),
            children: alert.customer.phone,
          },
          {
            key: 'address',
            label: t('detail.address'),
            children: alert.customer.address,
          },
        ]}
      />
    </Section>
  );
}
export function AlertSiblingsBlock({ alert }: { alert: AlertDetail }) {
  const { t } = useTranslation('alerts');
  const navigate = useNavigate({ from: '/alerts/' });
  if (!alert.siblingAlerts.length) return null;
  return (
    <Section title={t('detail.siblings')}>
      {alert.siblingAlerts.map((sibling) => (
        <button
          key={sibling.id}
          type="button"
          className="flex w-full justify-between border-b py-2 text-left last:border-0"
          onClick={() =>
            void navigate({
              search: (previous) => ({ ...previous, alertId: sibling.id }),
            })
          }
        >
          <span>{sibling.name}</span>
          <span className="font-mono text-xs">{sibling.errorCode}</span>
        </button>
      ))}
    </Section>
  );
}
