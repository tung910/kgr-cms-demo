import { Layout, Menu } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortalMenuKey } from '@/core/permissions/capabilities';

const { Sider } = Layout;

export type PortalNavigationGroup = 'operations' | 'business' | 'system';

export interface PortalNavigationItem {
  key: PortalMenuKey;
  label: string;
  icon: ReactNode;
  group?: PortalNavigationGroup;
}

export interface PortalSidebarProps {
  items: readonly PortalNavigationItem[];
  selectedKey: PortalMenuKey;
  collapsed: boolean;
  onNavigate: (key: PortalMenuKey) => void;
}

export function PortalSidebar({
  items,
  selectedKey,
  collapsed,
  onNavigate,
}: PortalSidebarProps) {
  const { t } = useTranslation('common');
  const groupLabels: Record<PortalNavigationGroup, string> = {
    operations: t('sidebar.groupOperations'),
    business: t('sidebar.groupBusiness'),
    system: t('sidebar.groupSystem'),
  };
  const menuItems = [
    {
      type: 'group' as const,
      label: t('sidebar.groupOverview'),
      children: items.filter((item) => item.key === 'overview').map(toMenuItem),
    },
    ...(['operations', 'business', 'system'] as const).map((group) => ({
      type: 'group' as const,
      label: groupLabels[group],
      children: items.filter((item) => item.group === group).map(toMenuItem),
    })),
  ].filter((item) => item.children.length > 0);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={260}
      className="portal-sider"
    >
      <div className="flex h-16 items-center px-5 text-lg font-bold text-[#020204]">
        {collapsed ? t('sidebar.brandShort') : t('sidebar.brandFull')}
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => onNavigate(key as PortalMenuKey)}
      />
    </Sider>
  );
}

function toMenuItem(item: PortalNavigationItem) {
  return {
    key: item.key,
    icon: item.icon,
    label: item.label,
  };
}
