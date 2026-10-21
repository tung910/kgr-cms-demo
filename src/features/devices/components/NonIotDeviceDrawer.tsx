import type { ReactNode } from 'react';
import { ApiOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Drawer } from 'antd';
import { useTranslation } from 'react-i18next';

import { normalizeApiError } from '@/core/api/error';
import { PageState } from '@/shared/components/PageState';
import { PortalBadge } from '@/shared/components/portal';
import { formatDate } from '@/shared/lib/format';

import { nonIotDeviceQueries } from '../queries/deviceListExtraQueries';
import type { NonIotDevice } from '../schemas/nonIotDeviceSchemas';
import { NonIotWarrantyCell } from './NonIotDeviceTable';

export interface NonIotDeviceDrawerProps {
  deviceId: string | undefined;
  onClose: () => void;
}

// Read-only record of a sold non-IoT unit. There is nothing to monitor or
// command remotely, so it stays a drawer instead of the IoT detail page.
export function NonIotDeviceDrawer({
  deviceId,
  onClose,
}: NonIotDeviceDrawerProps) {
  const device = useQuery({
    ...nonIotDeviceQueries.detail(deviceId ?? ''),
    enabled: Boolean(deviceId),
  });

  let body: ReactNode;
  if (device.isPending) {
    body = <PageState kind="loading" />;
  } else if (device.isError) {
    const error = normalizeApiError(device.error);
    body =
      error.kind === 'forbidden' || error.kind === 'notFound' ? (
        <PageState kind={error.kind} description={error.message} />
      ) : (
        <PageState
          kind="error"
          description={error.message}
          onRetry={() => void device.refetch()}
        />
      );
  } else {
    body = <NonIotDeviceBody device={device.data} />;
  }

  return (
    <Drawer
      title={deviceId}
      placement="right"
      open={Boolean(deviceId)}
      onClose={onClose}
      size={480}
      destroyOnHidden
    >
      {body}
    </Drawer>
  );
}

function NonIotDeviceBody({ device }: { device: NonIotDevice }) {
  const { t } = useTranslation('devices');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-[#020204]">
          {device.modelName}
        </span>
        <PortalBadge tone="info">
          <ApiOutlined /> {t('productConnectivity.non_iot', { ns: 'common' })}
        </PortalBadge>
      </div>

      <Alert
        type="info"
        showIcon
        title={t('nonIot.detail.title')}
        description={
          <div className="space-y-2">
            <p className="m-0">{t('nonIot.detail.description')}</p>
            <ul className="m-0 list-disc space-y-1 pl-5">
              <li>{t('nonIot.detail.trackWarranty')}</li>
              <li>{t('nonIot.detail.trackCores')}</li>
              <li>{t('nonIot.detail.trackService')}</li>
            </ul>
          </div>
        }
      />

      <dl className="m-0 space-y-3 rounded-xl border border-[#E7E8E9] p-3 text-sm">
        <Row label={t('nonIot.detail.owner')}>{device.ownerId ?? '—'}</Row>
        <Row label={t('nonIot.detail.location')}>
          {[device.ward, device.region].filter(Boolean).join(', ')}
        </Row>
        <Row label={t('nonIot.detail.batch')}>
          <span className="font-mono">{device.batchCode}</span>
        </Row>
        <Row label={t('nonIot.detail.manufacturedAt')}>
          {formatDate(device.manufacturedAt)}
        </Row>
        <Row label={t('table.columns.activatedAt')}>
          {device.activatedAt ? formatDate(device.activatedAt) : '—'}
        </Row>
        <Row label={t('nonIot.table.warranty')}>
          <NonIotWarrantyCell device={device} />
        </Row>
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[#636466]">{label}</dt>
      <dd className="m-0 text-right text-[#020204]">{children}</dd>
    </div>
  );
}
