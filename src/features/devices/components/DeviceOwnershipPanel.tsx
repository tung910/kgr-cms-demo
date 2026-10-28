import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Table, Timeline, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalBadge, PortalCard } from '@/shared/components/portal';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';

import { removeDeviceOwner, revokeSharedMember } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device, DeviceSharedMember } from '../schemas/deviceSchemas';
import { activeEntitlementsCount } from '../utils/entitlementDisplay';
import { DeviceOwnerChangeDialog } from './DeviceOwnerChangeDialog';
import { DeviceReasonConfirmDialog } from './DeviceReasonConfirmDialog';

export interface DeviceOwnershipPanelProps {
  device: Device;
  onOwnerClick: () => void;
}

type Removal =
  { kind: 'owner' } | { kind: 'member'; member: DeviceSharedMember };

// §3.4b — rendered only for device.pii.full. Change owner needs
// device.owner.update; removing the owner or a shared member is the D cell
// (device.lifecycle), so service center can edit but not remove.
export function DeviceOwnershipPanel({
  device,
  onOwnerClick,
}: DeviceOwnershipPanelProps) {
  const { t, i18n } = useTranslation('devices');
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [changeOpen, setChangeOpen] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const canRemove = Boolean(
    session && hasCapability(session.role, 'device.lifecycle')
  );
  // §5.4 — entitlements go with the device, not the owner: surface the count
  // in the owner-removal confirmation so the operator knows they stay put.
  const transferCount = activeEntitlementsCount(device.entitlementsSummary);

  const remove = useMutation({
    mutationFn: async ({
      target,
      reason,
    }: {
      target: Removal;
      reason: string;
    }): Promise<string> => {
      if (target.kind === 'owner') {
        const result = await removeDeviceOwner(device.id, reason);
        return result.previousOwnerNotified
          ? 'ownership.removeSuccessNotified'
          : 'ownership.removeSuccess';
      }
      await revokeSharedMember(device.id, target.member.id, reason);
      return 'ownership.revokeSuccess';
    },
    onSuccess: (successKey) => {
      void message.success(t(successKey));
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
      setRemoval(null);
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('ownership.error'));
    },
  });

  const dialog =
    removal?.kind === 'owner'
      ? {
          title: t('ownership.removeTitle'),
          warning: t('ownership.removeWarning'),
          okText: t('ownership.removeConfirm'),
        }
      : removal?.kind === 'member'
        ? {
            title: t('ownership.revokeTitle', { name: removal.member.name }),
            warning: t('ownership.revokeWarning'),
            okText: t('ownership.revokeConfirm'),
          }
        : { title: '', warning: '', okText: '' };

  return (
    <PortalCard title={t('ownership.title')}>
      <div className="space-y-5">
        <div>
          <p className="m-0 text-xs font-medium uppercase text-[#636466]">
            {t('ownership.currentOwner')}
          </p>
          {device.owner ? (
            <div className="mt-2 space-y-1 text-sm">
              <button
                type="button"
                onClick={onOwnerClick}
                className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-[#F16522] hover:underline"
              >
                {device.owner.name ?? device.owner.id}
              </button>
              <p className="m-0 text-[#636466]">
                {t('ownership.phone')}:{' '}
                <span className="font-mono text-[#020204]">
                  {device.owner.phoneMasked ?? t('ownership.notAvailable')}
                </span>
              </p>
              <p className="m-0 text-[#636466]">
                {t('ownership.address')}:{' '}
                <span className="text-[#020204]">
                  {device.owner.address ?? t('ownership.notAvailable')}
                </span>
              </p>
            </div>
          ) : (
            <p className="mb-0 mt-2 text-sm text-[#636466]">
              {t('ownership.noOwner')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <PermissionGuard capability="device.owner.update">
              <Button size="small" onClick={() => setChangeOpen(true)}>
                {t('ownership.change')}
              </Button>
            </PermissionGuard>
            {device.owner ? (
              <PermissionGuard capability="device.lifecycle">
                <Button
                  size="small"
                  danger
                  onClick={() => setRemoval({ kind: 'owner' })}
                >
                  {t('ownership.remove')}
                </Button>
              </PermissionGuard>
            ) : null}
          </div>
        </div>

        <div>
          <p className="m-0 text-xs font-medium uppercase text-[#636466]">
            {t('ownership.sharedMembers')}
          </p>
          <Table<DeviceSharedMember>
            className="mt-2"
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 520 }}
            dataSource={device.sharedMembers}
            locale={{ emptyText: t('ownership.noSharedMembers') }}
            columns={[
              { title: t('ownership.columns.name'), dataIndex: 'name' },
              {
                title: t('ownership.columns.phone'),
                dataIndex: 'phone',
                render: (value?: string) => (
                  <span className="font-mono">
                    {value ?? t('ownership.notAvailable')}
                  </span>
                ),
              },
              {
                title: t('ownership.columns.address'),
                dataIndex: 'address',
                render: (value?: string) =>
                  value ?? t('ownership.notAvailable'),
              },
              {
                title: t('ownership.columns.permission'),
                dataIndex: 'permission',
                render: (value: DeviceSharedMember['permission']) => (
                  <PortalBadge tone={value === 'control' ? 'info' : 'primary'}>
                    {t('ownership.permission.' + value)}
                  </PortalBadge>
                ),
              },
              ...(canRemove
                ? [
                    {
                      title: t('ownership.columns.actions'),
                      key: 'actions',
                      render: (_: unknown, member: DeviceSharedMember) => (
                        <Button
                          size="small"
                          danger
                          type="link"
                          onClick={() => setRemoval({ kind: 'member', member })}
                        >
                          {t('ownership.revoke')}
                        </Button>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div>
          <p className="m-0 text-xs font-medium uppercase text-[#636466]">
            {t('ownership.history')}
          </p>
          <Timeline
            className="mt-3"
            items={device.ownerHistory.map((entry) => ({
              children: (
                <div>
                  <p className="m-0 text-sm font-semibold">{entry.ownerName}</p>
                  <p className="mb-0 mt-1 text-xs text-[#636466]">
                    {formatDateTime(entry.startedAt, i18n.resolvedLanguage)} —{' '}
                    {entry.endedAt
                      ? formatDateTime(entry.endedAt, i18n.resolvedLanguage)
                      : t('ownership.present')}
                  </p>
                  {entry.reason ? (
                    <p className="mb-0 mt-1 text-xs text-[#636466]">
                      {t('ownership.endReason')}: {entry.reason}
                    </p>
                  ) : null}
                </div>
              ),
            }))}
          />
        </div>
      </div>

      <PermissionGuard capability="device.owner.update">
        <DeviceOwnerChangeDialog
          device={device}
          open={changeOpen}
          onClose={() => setChangeOpen(false)}
        />
      </PermissionGuard>
      <DeviceReasonConfirmDialog
        open={removal !== null}
        title={dialog.title}
        warning={dialog.warning}
        extra={
          removal?.kind === 'owner' && transferCount > 0 ? (
            <Alert
              type="info"
              showIcon
              message={t('ownership.entitlementsTransferNotice', {
                count: transferCount,
              })}
              className="mb-4"
            />
          ) : undefined
        }
        okText={dialog.okText}
        pending={remove.isPending}
        onCancel={() => setRemoval(null)}
        onConfirm={(reason) => {
          if (removal) remove.mutate({ target: removal, reason });
        }}
      />
    </PortalCard>
  );
}
