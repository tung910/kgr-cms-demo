import { SyncOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

import { syncInventory } from '../api/inventoryApi';
import { deviceQueries } from '../queries/deviceQueries';

// "Đồng bộ": pulls newly received, never-activated units from the warehouse
// system, then refreshes the stock list, cards and tab counts.
export function InventorySyncButton() {
  const { t } = useTranslation('devices');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: syncInventory,
    onSuccess: (result) => {
      void message.success(
        result.added + result.updated === 0
          ? t('inventory.sync.upToDate')
          : t('inventory.sync.success', {
              added: result.added,
              updated: result.updated,
            })
      );
      void queryClient.invalidateQueries({
        queryKey: [...deviceQueries.all, 'inventory'],
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('inventory.sync.error'));
    },
  });

  return (
    <PermissionGuard capability="device.inventory.sync">
      <Button
        icon={<SyncOutlined />}
        loading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {t('inventory.sync.action')}
      </Button>
    </PermissionGuard>
  );
}
