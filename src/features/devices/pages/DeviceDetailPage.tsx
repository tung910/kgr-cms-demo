import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

import { DeviceCoreAlertsPanel } from '../components/DeviceCoreAlertsPanel';
import { DeviceDeleteDialog } from '../components/DeviceDeleteDialog';
import { DeviceFilterCoresPanel } from '../components/DeviceFilterCoresPanel';
import { DeviceHistoryPanel } from '../components/DeviceHistoryPanel';
import { DeviceLifecycleActions } from '../components/DeviceLifecycleActions';
import { DeviceOverview } from '../components/DeviceOverview';
import { DeviceOwnerDrawer } from '../components/DeviceOwnerDrawer';
import { DeviceOwnershipPanel } from '../components/DeviceOwnershipPanel';
import { DeviceRemoteActions } from '../components/DeviceRemoteActions';
import { DeviceRemoteDiagnosticPanel } from '../components/DeviceRemoteDiagnosticPanel';
import { DeviceTelemetryPanel } from '../components/DeviceTelemetryPanel';
import { deviceQueries } from '../queries/deviceQueries';

export interface DeviceDetailPageProps {
  deviceId: string;
}

export function DeviceDetailPage({ deviceId }: DeviceDetailPageProps) {
  const { t } = useTranslation('devices');
  const { session } = useAuth();
  const { data: device } = useSuspenseQuery(deviceQueries.detail(deviceId));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);
  const openOwnerDrawer = () => setOwnerDrawerOpen(true);
  // §3.4: factory, sales and logistics only see the technical block.
  const canSeeOwner = Boolean(
    session && hasCapability(session.role, 'device.pii.full')
  );
  const canSeeHistory = Boolean(
    session && hasCapability(session.role, 'device.history.read')
  );
  const canSeeControlState = Boolean(
    session && hasCapability(session.role, 'device.control.read')
  );
  const neverOperated =
    !device.activatedAt &&
    !device.lastOnlineAt &&
    device.latestTelemetry.length === 0 &&
    device.status !== 'online';
  // Non-IoT products have no module: no telemetry, diagnostics or commands.
  const iot = device.connectivity === 'iot';

  return (
    <div className="space-y-4">
      <DeviceOverview
        device={device}
        showOwner={canSeeOwner}
        showControlState={canSeeControlState}
        onOwnerClick={openOwnerDrawer}
        actions={
          iot ? (
            <DeviceRemoteActions device={device} placement="header" />
          ) : null
        }
        secondaryActions={
          <>
            <DeviceLifecycleActions device={device} />
            {neverOperated ? (
              <PermissionGuard capability="device.lifecycle">
                <Button size="small" danger onClick={() => setDeleteOpen(true)}>
                  {t('ownership.deleteRecord')}
                </Button>
              </PermissionGuard>
            ) : null}
          </>
        }
      />

      <DeviceCoreAlertsPanel device={device} />

      {iot ? <DeviceTelemetryPanel device={device} /> : null}
      <DeviceFilterCoresPanel device={device} />

      {iot ? <DeviceRemoteDiagnosticPanel device={device} /> : null}

      {canSeeHistory || canSeeOwner ? (
        <div
          className={
            canSeeHistory && canSeeOwner
              ? 'grid gap-4 xl:grid-cols-3'
              : 'grid gap-4'
          }
        >
          {canSeeHistory ? (
            <div className={canSeeOwner ? 'xl:col-span-2' : undefined}>
              <DeviceHistoryPanel device={device} />
            </div>
          ) : null}
          {canSeeOwner ? (
            <DeviceOwnershipPanel
              device={device}
              onOwnerClick={openOwnerDrawer}
            />
          ) : null}
        </div>
      ) : null}

      {canSeeOwner && device.owner ? (
        <DeviceOwnerDrawer
          deviceId={device.id}
          open={ownerDrawerOpen}
          onClose={() => setOwnerDrawerOpen(false)}
        />
      ) : null}

      <PermissionGuard capability="device.lifecycle">
        <DeviceDeleteDialog
          device={device}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
        />
      </PermissionGuard>
    </div>
  );
}
