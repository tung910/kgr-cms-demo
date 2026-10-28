import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  PortalBadge,
  PortalCard,
  PortalProgress,
} from '@/shared/components/portal';
import {
  formatDate,
  formatDateTimeInLocale as formatDateTime,
} from '@/shared/lib/format';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type { Entitlement } from '../schemas/entitlementSchemas';
import {
  ENTITLEMENT_STATUS_TONE,
  daysRemaining,
} from '../utils/entitlementDisplay';
import { EntitlementEventLog } from './EntitlementEventLog';

const SOURCE_KIND_KEY: Record<Entitlement['source']['kind'], string> = {
  auto_attach: 'autoAttach',
  bulk_assign: 'bulkAssign',
  manual_add: 'manualAdd',
};

const TICKET_STATUS_KEY: Record<string, string> = {
  pending: 'pending',
  assigned: 'assigned',
  in_progress: 'inProgress',
};

function Empty({ text }: { text: string }) {
  return <p className="m-0 py-6 text-center text-sm text-[#636466]">{text}</p>;
}

// One entitlement's card: name/code/group/delivery/status, validity window,
// usage (counted kind), warranty-independence note (§6.4), source and the
// collapsible usage-event history. No action buttons render here — Task 6
// (ghi nhận gửi lõi / ghi nhận sử dụng / hoàn lượt / thêm gói) is deferred
// until service_entitlement.record/adjust are approved; this card's layout
// still leaves a natural place for that below the source line.
function EntitlementCard({
  entitlement,
  device,
}: {
  entitlement: Entitlement;
  device: Device;
}) {
  const { t, i18n } = useTranslation('devices');
  const locale = i18n.resolvedLanguage;
  const snapshot = entitlement.packageSnapshot;

  const validity = !entitlement.startsAt
    ? t('entitlements.panel.validityPending')
    : t('entitlements.panel.validity', {
        start: formatDate(entitlement.startsAt),
        end: entitlement.endsAt
          ? formatDate(entitlement.endsAt)
          : t('entitlements.panel.noEnd'),
      });

  const showRemaining =
    (entitlement.status === 'active' || entitlement.status === 'expiring') &&
    entitlement.endsAt;

  const sourceKind = t(
    'entitlements.panel.sourceKind.' + SOURCE_KIND_KEY[entitlement.source.kind]
  );

  const warrantyLine =
    snapshot.group === 'warranty'
      ? device.warrantyExpiresAt
        ? t('entitlements.panel.warrantyIndependent', {
            date: formatDate(device.warrantyExpiresAt),
          })
        : t('entitlements.panel.warrantyIndependentNoDate')
      : null;

  return (
    <div className="rounded-xl border border-solid border-[#EEEFEF] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#020204]">
              {snapshot.name}
            </span>
            <span className="rounded-md bg-[#F3F4F4] px-1.5 py-0.5 font-mono text-xs text-[#636466]">
              {snapshot.code}
            </span>
          </div>
          <p className="m-0 mt-1 text-xs text-[#636466]">
            {t('groups.' + snapshot.group, { ns: 'servicePackages' })}
            {snapshot.delivery
              ? ` · ${t('entitlements.panel.delivery.' + snapshot.delivery)}`
              : ''}
          </p>
        </div>
        <PortalBadge tone={ENTITLEMENT_STATUS_TONE[entitlement.status]}>
          {t('entitlements.statuses.' + entitlement.status)}
        </PortalBadge>
      </div>

      <p className="m-0 mt-3 text-xs text-[#636466]">{validity}</p>
      {showRemaining ? (
        <p className="m-0 mt-1 text-xs text-[#636466]">
          {t('entitlements.panel.remainingDays', {
            count: daysRemaining(entitlement.endsAt),
          })}
        </p>
      ) : null}

      {entitlement.kind === 'counted' ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#636466]">
            <span>
              {t('entitlements.panel.usedOf', {
                used: entitlement.used,
                quota: entitlement.quota ?? 0,
              })}
            </span>
          </div>
          <PortalProgress
            value={entitlement.used}
            max={entitlement.quota ?? 0}
            tone={ENTITLEMENT_STATUS_TONE[entitlement.status]}
            className="h-1.5"
          />
          {entitlement.openReservations.map((reservation) => (
            <p
              key={reservation.ticketId}
              className="m-0 text-xs text-[#636466]"
            >
              {t('entitlements.panel.reserved', {
                ticket: reservation.ticketCode,
                status: t(
                  'entitlements.panel.ticketStatus.' +
                    (TICKET_STATUS_KEY[reservation.ticketStatus] ??
                      reservation.ticketStatus)
                ),
                scheduled: reservation.scheduledAt
                  ? formatDateTime(reservation.scheduledAt, locale)
                  : t('entitlements.panel.noSchedule'),
              })}
            </p>
          ))}
          {entitlement.nextDueAt ? (
            <p className="m-0 text-xs text-[#636466]">
              {t('entitlements.panel.nextDue', {
                date: formatDate(entitlement.nextDueAt),
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      {warrantyLine ? (
        <p className="m-0 mt-3 text-xs italic text-[#636466]">{warrantyLine}</p>
      ) : null}

      <p className="m-0 mt-3 text-xs text-[#9A9B9C]">
        {t('entitlements.panel.source', {
          kind: sourceKind,
          reference: entitlement.source.reference,
          date: formatDateTime(entitlement.source.at, locale),
        })}
      </p>

      <div className="mt-3">
        <EntitlementEventLog entitlementId={entitlement.id} />
      </div>
    </div>
  );
}

// §8.2 — "Gói dịch vụ" detail block, shown for both IoT and non-IoT devices
// right after DeviceFilterCoresPanel. Read-only in this round (see
// EntitlementCard doc comment).
export function DeviceEntitlementsPanel({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const entitlements = useQuery(deviceQueries.entitlements(device.id));

  return (
    <PortalCard title={t('entitlements.panel.title')}>
      {!entitlements.data?.length ? (
        <Empty
          text={
            entitlements.isPending
              ? t('entitlements.panel.loading')
              : entitlements.isError
                ? t('entitlements.panel.error')
                : t('entitlements.panel.empty')
          }
        />
      ) : (
        <div className="space-y-3">
          {entitlements.data.map((entitlement) => (
            <EntitlementCard
              key={entitlement.id}
              entitlement={entitlement}
              device={device}
            />
          ))}
        </div>
      )}
    </PortalCard>
  );
}
