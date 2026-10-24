import type { ReactNode } from 'react';
import {
  ApiOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  ClusterOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ConnectionStatusBadge } from '@/shared/components/ConnectionStatusBadge';
import { PortalBadge, PortalCard } from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';
import { formatDate } from '@/shared/lib/format';
import { referenceColors, softTones } from '@/theme/tokens';

import type { Device } from '../schemas/deviceSchemas';
import { getDeviceStatusDisplay } from '../utils/deviceStatusDisplay';
import { DeviceMainStatusBadge, DeviceStatusTags } from './DeviceStatusCell';

export interface DeviceOverviewProps {
  device: Device;
  /** §3.4: owner name/phone only for roles holding device.pii.full. */
  showOwner: boolean;
  /** §3.4c (R): read-only power and lock state, e.g. for the factory role. */
  showControlState: boolean;
  /** Primary remote actions, right-aligned in the header. */
  actions?: ReactNode;
  /** Record-management actions (restore, delete) under the identity. */
  secondaryActions?: ReactNode;
  /** Opens the owner profile drawer. */
  onOwnerClick: () => void;
}

type SignalQuality = 'stable' | 'weak' | 'poor' | 'unknown';

function signalQuality(dbm: number | null): SignalQuality {
  if (dbm === null) return 'unknown';
  if (dbm >= -60) return 'stable';
  if (dbm >= -75) return 'weak';
  return 'poor';
}

const signalTone: Record<SignalQuality, PortalTone> = {
  stable: 'primary',
  weak: 'warning',
  poor: 'danger',
  unknown: 'warning',
};

type TdsLevel = 'verySafe' | 'safe' | 'high';

// Display-only bands for drinking-water TDS; alerting thresholds are
// configured server-side and are not derived from these.
function tdsLevel(ppm: number): TdsLevel {
  if (ppm <= 50) return 'verySafe';
  if (ppm <= 100) return 'safe';
  return 'high';
}

const tdsTone: Record<TdsLevel, PortalTone> = {
  verySafe: 'primary',
  safe: 'info',
  high: 'danger',
};

function daysUntil(value?: string): number | null {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function warrantyMonths(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth();
  return months > 0 ? months : null;
}

// Time only for today's heartbeat; older ones need the date to be meaningful.
function formatLastConnected(value: string | null, locale?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(locale, {
    ...(!sameDay && { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function TileHeader({
  icon,
  tone,
  title,
  badge,
}: {
  icon: ReactNode;
  tone: PortalTone;
  title: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{
            backgroundColor: softTones[tone],
            color: referenceColors[tone],
          }}
        >
          {icon}
        </span>
        <span className="text-base font-medium text-[#020204]">{title}</span>
      </div>
      {badge}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-[#636466]">
        {icon}
        {label}
      </span>
      <span className="text-right text-[#020204]">{value}</span>
    </div>
  );
}

// M03 §4.2 block 1 (real-time) — identity header plus the three at-a-glance
// cards; the full telemetry series lives in DeviceTelemetryPanel.
export function DeviceOverview({
  device,
  actions,
  secondaryActions,
  onOwnerClick,
  showControlState,
  showOwner,
}: DeviceOverviewProps) {
  const { t, i18n } = useTranslation('devices');
  const locale = i18n.resolvedLanguage;
  const metric = (key: string) =>
    device.latestTelemetry.find((item) => item.metricKey === key);
  const tdsOut = metric('tds_out');
  const tdsIn = metric('tds_in');
  const nonIot = device.connectivity === 'non_iot';
  // Same rules as the list's status column; the lock tag follows
  // `showControlState` (device.control.read, §3.4c).
  const statusDisplay = getDeviceStatusDisplay(device, {
    canSeeLock: showControlState,
  });
  const offline = device.status === 'offline';
  const quality = offline ? 'unknown' : signalQuality(device.wifiSignalDbm);
  // Offline trumps signal quality: an unreachable device is never 'stable'.
  const connectionTone: PortalTone = offline ? 'danger' : signalTone[quality];
  const warrantyDaysLeft = daysUntil(device.warrantyExpiresAt);
  const months = warrantyMonths(device.activatedAt, device.warrantyExpiresAt);

  const ownerLine = [
    !showOwner ? null : device.owner ? (
      <button
        key="owner"
        type="button"
        onClick={onOwnerClick}
        className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[#F16522] hover:underline"
      >
        <UserOutlined /> {device.owner.name ?? device.owner.id}
      </button>
    ) : (
      <span key="owner">
        <UserOutlined /> {t('detailPage.noOwner')}
      </span>
    ),
    device.region ? <span key="region">{device.region}</span> : null,
    showOwner && device.owner?.phoneMasked ? (
      <span key="phone" className="font-mono">
        {device.owner.phoneMasked}
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <PortalCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <Link
              to="/devices"
              search={{ search: '', page: 1, pageSize: 10 }}
              className="inline-flex items-center gap-2 text-sm text-[#636466]"
            >
              <ArrowLeftOutlined />
              {t('detailPage.backToList')}
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-2xl font-bold text-[#020204]">
                {device.displayName || device.modelName}
              </h1>
              <span className="rounded-lg bg-[#F3F4F4] px-2 py-1 font-mono text-xs text-[#636466]">
                {t('detailPage.serial', { id: device.id })}
              </span>
              {nonIot ? (
                <PortalBadge tone="info">
                  {t('productConnectivity.non_iot', { ns: 'common' })}
                </PortalBadge>
              ) : null}
            </div>
            {statusDisplay.tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <DeviceStatusTags tags={statusDisplay.tags} />
              </div>
            ) : null}
            {showControlState && !nonIot ? (
              <div className="flex flex-wrap items-center gap-2">
                <PortalBadge tone={device.powered ? 'primary' : 'danger'} dot>
                  {t(
                    device.powered
                      ? 'controlState.powerOn'
                      : 'controlState.powerOff'
                  )}
                </PortalBadge>
                {device.lifecycleState !== 'decommissioned' ? (
                  <PortalBadge
                    tone={
                      device.lifecycleState === 'locked' ? 'warning' : 'primary'
                    }
                    dot
                  >
                    {t(
                      device.lifecycleState === 'locked'
                        ? 'controlState.locked'
                        : 'controlState.unlocked'
                    )}
                  </PortalBadge>
                ) : null}
              </div>
            ) : null}
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#636466]">
              {ownerLine.map((part, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span aria-hidden className="text-[#C4C6C8]">
                      •
                    </span>
                  ) : null}
                  {part}
                </span>
              ))}
            </p>
            {secondaryActions ? (
              <div className="flex flex-wrap items-center gap-2">
                {secondaryActions}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        </div>
      </PortalCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nonIot ? (
          <PortalCard className="h-full md:col-span-1 xl:col-span-2">
            <div className="flex h-full flex-col gap-3">
              <TileHeader
                icon={<ApiOutlined />}
                tone="info"
                title={t('nonIot.detail.title')}
                badge={<ConnectionStatusBadge status={null} />}
              />
              <p className="m-0 text-sm text-[#636466]">
                {t('nonIot.detail.description')}
              </p>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[#020204]">
                <li>{t('nonIot.detail.trackWarranty')}</li>
                <li>{t('nonIot.detail.trackCores')}</li>
                <li>{t('nonIot.detail.trackService')}</li>
              </ul>
            </div>
          </PortalCard>
        ) : (
          <>
            <PortalCard className="h-full">
              <div className="flex h-full flex-col gap-4">
                <TileHeader
                  icon={<ExperimentOutlined />}
                  tone="water"
                  title={t('detailPage.cards.tdsTitle')}
                  badge={
                    tdsOut ? (
                      <PortalBadge tone={tdsTone[tdsLevel(tdsOut.value)]}>
                        {t('detailPage.tdsLevel.' + tdsLevel(tdsOut.value))}
                      </PortalBadge>
                    ) : null
                  }
                />
                <div className="flex-1">
                  <p className="m-0 text-4xl font-bold text-[#058642]">
                    {tdsOut ? tdsOut.value.toLocaleString(locale) : '—'}{' '}
                    <span className="text-sm font-normal text-[#636466]">
                      {tdsOut?.unit}
                    </span>
                  </p>
                  <p className="m-0 text-sm text-[#636466]">
                    {t('detailPage.cards.tdsOutHint')}
                  </p>
                </div>
                <div className="border-0 border-t border-solid border-[#EEEFEF] pt-3 text-sm text-[#636466]">
                  {t('detailPage.cards.tdsIn')}{' '}
                  <span className="font-mono font-semibold text-[#020204]">
                    {tdsIn ? `${tdsIn.value} ${tdsIn.unit}` : '—'}
                  </span>
                </div>
              </div>
            </PortalCard>

            <PortalCard className="h-full">
              <div className="flex h-full flex-col gap-4">
                <TileHeader
                  icon={<WifiOutlined />}
                  tone={connectionTone}
                  title={t('detailPage.cards.connectionTitle')}
                  badge={<DeviceMainStatusBadge main={statusDisplay.main} />}
                />
                <div className="flex flex-1 flex-col justify-center gap-1">
                  <p
                    className="m-0 text-4xl font-bold"
                    style={{ color: referenceColors[connectionTone] }}
                  >
                    {!offline && device.latencyMs !== undefined
                      ? t('detailPage.cards.latencyWithSignal', {
                          latency: device.latencyMs,
                          signal: t('detailPage.signal.' + quality),
                        })
                      : t('detailPage.signal.' + quality)}
                  </p>
                  <p className="m-0 text-sm text-[#636466]">
                    {t('detailPage.cards.connectionHint.' + quality)}
                  </p>
                </div>
                <div className="border-0 border-t border-solid border-[#EEEFEF] pt-3 text-sm text-[#636466]">
                  {t('detailPage.cards.lastConnected')}{' '}
                  <span className="font-mono font-semibold text-[#020204]">
                    {formatLastConnected(device.lastOnlineAt, locale)}
                  </span>
                </div>
              </div>
            </PortalCard>
          </>
        )}

        <PortalCard className="h-full">
          <div className="flex h-full flex-col gap-4">
            <TileHeader
              icon={<SafetyCertificateOutlined />}
              tone="info"
              title={t('detailPage.cards.activationTitle')}
              badge={
                months ? (
                  <PortalBadge tone="info">
                    {t('detailPage.cards.warrantyMonths', { count: months })}
                  </PortalBadge>
                ) : null
              }
            />
            <div className="flex-1 space-y-2">
              <InfoRow
                icon={<CalendarOutlined />}
                label={t('detailPage.cards.warrantyTerm')}
                value={
                  device.warrantyExpiresAt ? (
                    <span className="inline-flex flex-wrap items-center justify-end gap-2">
                      {t(
                        device.warrantyStatus === 'expired'
                          ? 'detailPage.warrantyExpiredOn'
                          : 'detailPage.cards.warrantyUntilShort',
                        { date: formatDate(device.warrantyExpiresAt) }
                      )}
                      {warrantyDaysLeft !== null && warrantyDaysLeft > 0 ? (
                        <PortalBadge
                          tone={warrantyDaysLeft <= 30 ? 'warning' : 'primary'}
                        >
                          {t('detailPage.cards.warrantyDaysLeft', {
                            count: warrantyDaysLeft,
                          })}
                        </PortalBadge>
                      ) : null}
                    </span>
                  ) : (
                    t('warrantyStatus.' + device.warrantyStatus)
                  )
                }
              />
              {nonIot ? null : (
                <>
                  <InfoRow
                    icon={<ClusterOutlined />}
                    label={t('detailPage.cards.moduleFirmware')}
                    value={
                      <PortalBadge tone="primary">
                        {device.moduleFirmwareVersion}
                      </PortalBadge>
                    }
                  />
                  <InfoRow
                    icon={<ClusterOutlined />}
                    label={t('detailPage.cards.mainboardFirmware')}
                    value={
                      <span className="font-mono">
                        {device.mainboardFirmwareVersion}
                      </span>
                    }
                  />
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-0 border-t border-solid border-[#EEEFEF] pt-3 text-sm">
              <span className="text-[#636466]">
                {t('detailPage.stats.activatedAt')}
              </span>
              <span className="font-mono font-semibold text-[#020204]">
                {formatDate(device.activatedAt)}
              </span>
            </div>
          </div>
        </PortalCard>
      </div>
    </div>
  );
}
