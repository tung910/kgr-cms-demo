import { useState } from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { InventoryImportWizard } from './InventoryImportWizard';

export function InventorySyncButton() {
  const { t } = useTranslation('devices');
  const [open, setOpen] = useState(false);
  return (
    <PermissionGuard capability="device.inventory.sync">
      <Button icon={<SyncOutlined />} onClick={() => setOpen(true)}>
        {t('inventory.import.action')}
      </Button>
      {open ? <InventoryImportWizard onClose={() => setOpen(false)} /> : null}
    </PermissionGuard>
  );
}
