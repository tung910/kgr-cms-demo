import { Drawer, Menu } from 'antd';

import type { PortalMenuKey } from '@/core/permissions/capabilities';

import type { PortalNavigationItem } from './PortalSidebar';

export interface PortalMobileNavProps {
  open: boolean;
  items: readonly PortalNavigationItem[];
  selectedKey: PortalMenuKey;
  onClose: () => void;
  onNavigate: (key: PortalMenuKey) => void;
}

export function PortalMobileNav({
  open,
  items,
  selectedKey,
  onClose,
  onNavigate,
}: PortalMobileNavProps) {
  return (
    <Drawer
      title="KGR CMS"
      placement="left"
      open={open}
      onClose={onClose}
      size={280}
      className="portal-mobile-nav"
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
        }))}
        onClick={({ key }) => {
          onNavigate(key as PortalMenuKey);
          onClose();
        }}
      />
    </Drawer>
  );
}
