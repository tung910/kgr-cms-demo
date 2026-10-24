import type { ReactNode } from 'react';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Alert, Button, Drawer, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { normalizeApiError } from '@/core/api/error';
import { useAuth } from '@/core/auth/useAuth';
import { hasMenuAccess } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { ConnectionStatusBadge } from '@/shared/components/ConnectionStatusBadge';
import { PageState } from '@/shared/components/PageState';
import { PortalBadge } from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';
import { formatDate, formatDateTimeInLocale } from '@/shared/lib/format';
import { referenceColors } from '@/theme/tokens';

import { WARRANTY_STATUS_TONES } from '../constants/warranty';
import { deviceQueries } from '../queries/deviceQueries';
import type {
  DeviceOwnerProfile,
  DeviceOwnerProfileDevice,
} from '../schemas/deviceDetailSchemas';
import type { DeviceStatus } from '../schemas/deviceSchemas';
import { DeviceStatusTags } from './DeviceStatusCell';

export interface DeviceOwnerDrawerProps {
  deviceId: string;
  open: boolean;
  onClose: () => void;
}

// Devices needing attention first so CSKH sees problems without scrolling.
function attentionRank(device: {
  status: DeviceStatus | null;
  hasError: boolean;
}): number {
  if (device.status === 'online' && device.hasError) return 0;
  return device.status === 'offline' ? 1 : 2;
}

// M03.1: "từ thiết bị mở được sang hồ sơ khách hàng" — a quick profile view
// without leaving the device screen. Read-only, like the ownership panel.
export function DeviceOwnerDrawer({
  deviceId,
  open,
  onClose,
}: DeviceOwnerDrawerProps) {
  const { t } = useTranslation('devices');
  const { session } = useAuth();
  const navigate = useNavigate();
  const profile = useQuery({
    ...deviceQueries.ownerProfile(deviceId),
    enabled: open,
  });
  const ownerId = profile.data?.id;
  const canOpenCustomers = Boolean(
    session && hasMenuAccess(session.role, 'customers')
  );

  let body: ReactNode;
  if (profile.isPending) {
    body = <PageState kind="loading" />;
  } else if (profile.isError) {
    const error = normalizeApiError(profile.error);
    body =
      error.kind === 'forbidden' || error.kind === 'notFound' ? (
        <PageState kind={error.kind} description={error.message} />
      ) : (
        <PageState
          kind="error"
          description={error.message}
          onRetry={() => void profile.refetch()}
        />
      );
  } else {
    body = (
      <OwnerProfileBody
        profile={profile.data}
        currentDeviceId={deviceId}
        onNavigate={onClose}
      />
    );
  }

  return (
    <Drawer
      title={t('ownerDrawer.title')}
      placement="right"
      open={open}
      onClose={onClose}
      size={480}
      destroyOnHidden
      footer={
        ownerId ? (
          <div className="flex flex-wrap justify-end gap-2">
            <PermissionGuard capability="device.pii.full">
              <Button
                onClick={() => {
                  onClose();
                  void navigate({
                    to: '/devices',
                    search: {
                      search: '',
                      customerId: ownerId,
                      page: 1,
                      pageSize: 10,
                    },
                  });
                }}
              >
                {t('ownerDrawer.viewInDeviceList')}
              </Button>
            </PermissionGuard>
            {canOpenCustomers ? (
              <Button
                type="primary"
                onClick={() => {
                  onClose();
                  void navigate({ to: '/customers', hash: ownerId });
                }}
              >
                {t('ownerDrawer.openProfile')}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {body}
    </Drawer>
  );
}

function OwnerProfileBody({
  profile,
  currentDeviceId,
  onNavigate,
}: {
  profile: DeviceOwnerProfile;
  currentDeviceId: string;
  onNavigate: () => void;
}) {
  const { t, i18n } = useTranslation('devices');
  const devices = [...profile.devices].sort((a, b) => {
    if (a.id === currentDeviceId) return -1;
    if (b.id === currentDeviceId) return 1;
    // Non-IoT units have no connection state; list them after IoT ones.
    return (
      (a.status ? attentionRank(a) : 3) - (b.status ? attentionRank(b) : 3)
    );
  });
  const count = (predicate: (device: DeviceOwnerProfileDevice) => boolean) =>
    devices.filter(predicate).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#FEF0E9] text-lg font-semibold text-[#F26522]">
          {profile.name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="m-0 truncate text-lg font-semibold text-[#020204]">
            {profile.name}
          </p>
          <Typography.Text
            copyable
            className="font-mono text-xs text-[#636466]"
          >
            {profile.id}
          </Typography.Text>
        </div>
      </div>

      {profile.piiMasked ? (
        <Alert type="info" showIcon title={t('ownerDrawer.piiMasked')} />
      ) : null}

      <section className="space-y-2">
        <SectionTitle>{t('ownerDrawer.contact')}</SectionTitle>
        <div className="space-y-2 rounded-xl border border-[#E7E8E9] p-3">
          <ContactRow
            icon={<PhoneOutlined />}
            label={t('ownerDrawer.phone')}
            value={profile.phone}
            copyable={!profile.piiMasked}
          />
          <ContactRow
            icon={<MailOutlined />}
            label={t('ownerDrawer.email')}
            value={profile.email}
            copyable={!profile.piiMasked}
          />
          <ContactRow
            icon={<EnvironmentOutlined />}
            label={t('ownerDrawer.region')}
            value={profile.region}
          />
          <ContactRow
            icon={<CalendarOutlined />}
            label={t('ownerDrawer.joinedAt')}
            value={profile.joinedAt ? formatDate(profile.joinedAt) : undefined}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <StatTile
          label={t('ownerDrawer.stats.total')}
          value={devices.length}
          tone="info"
        />
        <StatTile
          label={t('ownerDrawer.stats.online')}
          value={count((device) => device.status === 'online')}
          tone="primary"
        />
        <StatTile
          label={t('ownerDrawer.stats.needsAttention')}
          value={count(
            (device) =>
              device.status === 'offline' ||
              (device.status === 'online' && device.hasError)
          )}
          tone="danger"
        />
        <StatTile
          label={t('ownerDrawer.stats.warrantyEnding')}
          value={count(
            (device) =>
              device.warrantyStatus === 'expiring' ||
              device.warrantyStatus === 'expired'
          )}
          tone="warning"
        />
      </section>

      <section className="space-y-2">
        <SectionTitle>
          {t('ownerDrawer.devices', { count: devices.length })}
        </SectionTitle>
        {devices.length === 0 ? (
          <PageState kind="empty" description={t('ownerDrawer.noDevices')} />
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {devices.map((device) => {
              const current = device.id === currentDeviceId;
              const card = (
                <div
                  className={`space-y-2 rounded-xl border p-3 ${
                    current
                      ? 'border-[#F26522] bg-[#FEF0E9]'
                      : 'border-[#E7E8E9] hover:border-[#F26522]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-semibold text-[#020204]">
                        {device.displayName || device.modelName}
                      </p>
                      <p className="m-0 mt-0.5 font-mono text-xs text-[#636466]">
                        {device.id} · {device.modelName}
                      </p>
                    </div>
                    {current ? (
                      <PortalBadge tone="warning">
                        {t('ownerDrawer.viewing')}
                      </PortalBadge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ConnectionStatusBadge status={device.status} />
                    {device.status === 'online' && device.hasError ? (
                      <DeviceStatusTags tags={['error']} />
                    ) : null}
                    <PortalBadge
                      tone={WARRANTY_STATUS_TONES[device.warrantyStatus]}
                    >
                      {t('warrantyStatus.' + device.warrantyStatus)}
                      {device.warrantyExpiresAt
                        ? ` · ${formatDate(device.warrantyExpiresAt)}`
                        : ''}
                    </PortalBadge>
                  </div>
                  <p className="m-0 text-xs text-[#636466]">
                    {t('ownerDrawer.lastOnline', {
                      date: formatDateTimeInLocale(
                        device.lastOnlineAt,
                        i18n.resolvedLanguage
                      ),
                    })}
                  </p>
                </div>
              );
              return (
                <li key={device.id}>
                  {current ? (
                    card
                  ) : (
                    <Link
                      to="/devices/$deviceId"
                      params={{ deviceId: device.id }}
                      onClick={onNavigate}
                      className="block"
                    >
                      {card}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-xs font-medium uppercase text-[#636466]">
      {children}
    </p>
  );
}

function ContactRow({
  icon,
  label,
  value,
  copyable = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex shrink-0 items-center gap-2 text-[#636466]">
        {icon}
        {label}
      </span>
      {value ? (
        <Typography.Text
          copyable={copyable}
          className="min-w-0 truncate text-right text-[#020204]"
        >
          {value}
        </Typography.Text>
      ) : (
        <span className="text-[#636466]">—</span>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: PortalTone;
}) {
  return (
    <div className="rounded-xl border border-[#E7E8E9] p-3">
      <p className="m-0 text-xs text-[#636466]">{label}</p>
      <p
        className="m-0 mt-1 text-xl font-semibold"
        style={{ color: referenceColors[tone] }}
      >
        {value}
      </p>
    </div>
  );
}
