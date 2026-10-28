import { useState, type ReactNode } from 'react';
import {
  CloudSyncOutlined,
  SyncOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

import { syncInventory } from '../api/inventoryApi';
import { deviceQueries } from '../queries/deviceQueries';

interface SyncOptionProps {
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

function SyncOption({
  icon,
  title,
  description,
  disabled,
  loading,
  onClick,
}: SyncOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-[#E7E8E9] bg-white p-4 text-left transition-colors enabled:hover:border-[#058642] enabled:hover:bg-[#E7F4EC] disabled:cursor-not-allowed disabled:bg-[#F9FAFA] disabled:opacity-60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F4] text-lg text-[#020204]">
        {loading ? <Spin size="small" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#020204]">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-[#636466]">
          {description}
        </span>
      </span>
    </button>
  );
}

// "Đồng bộ": brings newly received, never-activated units into the stock
// list. Two sources: a file upload (not built yet, shown disabled) or an
// automatic pull from the warehouse system.
export function InventorySyncButton() {
  const { t } = useTranslation('devices');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: syncInventory,
    onSuccess: (result) => {
      void message.success(
        result.added + result.updated === 0
          ? t('inventory.sync.upToDate')
          : result.entitlementsAttached > 0
            ? t('inventory.sync.successWithEntitlements', {
                added: result.added,
                updated: result.updated,
                count: result.entitlementsAttached,
              })
            : t('inventory.sync.success', {
                added: result.added,
                updated: result.updated,
              })
      );
      void queryClient.invalidateQueries({
        queryKey: [...deviceQueries.all, 'inventory'],
      });
      setOpen(false);
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('inventory.sync.error'));
    },
  });

  return (
    <PermissionGuard capability="device.inventory.sync">
      <Button icon={<SyncOutlined />} onClick={() => setOpen(true)}>
        {t('inventory.sync.action')}
      </Button>
      <Modal
        title={t('inventory.sync.title')}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        maskClosable={!mutation.isPending}
        closable={!mutation.isPending}
        destroyOnHidden
      >
        <div className="space-y-3">
          <SyncOption
            icon={<UploadOutlined />}
            title={t('inventory.sync.upload.title')}
            description={t('inventory.sync.upload.description')}
            disabled
          />
          <SyncOption
            icon={<CloudSyncOutlined />}
            title={t('inventory.sync.auto.title')}
            description={t('inventory.sync.auto.description')}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          />
        </div>
      </Modal>
    </PermissionGuard>
  );
}
