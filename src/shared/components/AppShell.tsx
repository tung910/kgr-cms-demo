import {
  AlertOutlined,
  AuditOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  KeyOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Breadcrumb, Layout } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChangePasswordModal } from '@/core/auth/ChangePasswordModal';
import { SimulationBanner } from '@/core/auth/SimulationBanner';
import { useAuth } from '@/core/auth/useAuth';
import {
  hasMenuAccess,
  type PortalMenuKey,
} from '@/core/permissions/capabilities';
import {
  PortalMobileNav,
  PortalSidebar,
  type PortalNavigationItem,
  PortalTopbar,
} from '@/shared/components/portal';

const { Content } = Layout;

const pathLabelKeys: Record<string, string> = {
  devices: 'nav.devices',
  alerts: 'nav.alerts',
  customers: 'nav.customers',
  firmware: 'nav.ota',
  maps: 'nav.device_map',
  serials: 'nav.serials',
  'core-config': 'nav.coreConfig',
  'analytics-reports': 'nav.analytics',
  system: 'nav.system',
  members: 'nav.members',
  audit: 'nav.audit_log',
  config: 'nav.system_config',
};

function getSelectedMenuKey(pathname: string): PortalMenuKey {
  if (pathname.startsWith('/devices')) return 'devices';
  if (pathname.startsWith('/firmware')) return 'ota';
  if (pathname.startsWith('/alerts')) return 'alerts';
  if (pathname.startsWith('/maps')) return 'device_map';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/serials')) return 'serials';
  if (pathname.startsWith('/analytics-reports')) return 'analytics';
  if (pathname.startsWith('/system/members')) return 'members';
  if (pathname.startsWith('/system/audit')) return 'audit_log';
  if (pathname.startsWith('/system/config')) return 'system_config';
  return 'overview';
}

export function AppShell() {
  const { t } = useTranslation('common');
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const navigationItems: readonly PortalNavigationItem[] = [
    { key: 'overview', icon: <DashboardOutlined />, label: t('nav.overview') },
    {
      key: 'devices',
      icon: <DatabaseOutlined />,
      label: t('nav.devices'),
      group: 'operations',
    },
    {
      key: 'ota',
      icon: <CloudUploadOutlined />,
      label: t('nav.ota'),
      group: 'operations',
    },
    {
      key: 'alerts',
      icon: <AlertOutlined />,
      label: t('nav.alerts'),
      group: 'operations',
    },
    {
      key: 'device_map',
      icon: <EnvironmentOutlined />,
      label: t('nav.device_map'),
      group: 'operations',
    },
    {
      key: 'customers',
      icon: <CustomerServiceOutlined />,
      label: t('nav.customers'),
      group: 'business',
    },
    {
      key: 'serials',
      icon: <QrcodeOutlined />,
      label: t('nav.serials'),
      group: 'operations',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: t('nav.analytics'),
      group: 'business',
    },
    {
      key: 'members',
      icon: <TeamOutlined />,
      label: t('nav.members'),
      group: 'system',
    },
    {
      key: 'audit_log',
      icon: <AuditOutlined />,
      label: t('nav.audit_log'),
      group: 'system',
    },
    {
      key: 'system_config',
      icon: <SettingOutlined />,
      label: t('nav.system_config'),
      group: 'system',
    },
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const updateCollapsed = () => setCollapsed(mediaQuery.matches);

    updateCollapsed();
    mediaQuery.addEventListener('change', updateCollapsed);
    return () => mediaQuery.removeEventListener('change', updateCollapsed);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    const handleMobileBreakpointChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      if (!event.matches) setMobileNavOpen(false);
    };

    updateIsMobile();
    mediaQuery.addEventListener('change', handleMobileBreakpointChange);
    return () =>
      mediaQuery.removeEventListener('change', handleMobileBreakpointChange);
  }, []);

  if (!session) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: t('topbar.sampleNotification.newAlert'),
      createdAtLabel: t('topbar.sampleNotification.minutesAgo', { count: 2 }),
    },
  ];

  const visibleItems = navigationItems.filter(
    (item) => item.key === 'overview' || hasMenuAccess(session.role, item.key)
  );
  const selectedKey = getSelectedMenuKey(location.pathname);
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'role-label',
      disabled: true,
      label: t('userMenu.roleLabel', { role: session.roleName }),
    },
    { type: 'divider' },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: t('userMenu.changePassword'),
    },
    { key: 'logout', icon: <LogoutOutlined />, label: t('userMenu.logout') },
  ];
  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index) => ({
      title:
        location.pathname.startsWith('/devices/') && index === 1
          ? t('breadcrumb.deviceDetail', { id: segment })
          : pathLabelKeys[segment]
            ? t(pathLabelKeys[segment])
            : segment,
    }));

  const navigateToMenu = (key: PortalMenuKey) => {
    switch (key) {
      case 'overview':
        void navigate({ to: '/' });
        break;
      case 'devices':
        void navigate({
          to: '/devices',
          search: { search: '', page: 1, pageSize: 10 },
        });
        break;
      case 'ota':
        void navigate({ to: '/firmware' });
        break;
      case 'alerts':
        void navigate({ to: '/alerts' });
        break;
      case 'device_map':
        void navigate({ to: '/maps' });
        break;
      case 'customers':
        void navigate({ to: '/customers' });
        break;
      case 'serials':
        void navigate({
          to: '/serials',
          search: { search: '', page: 1, pageSize: 20 },
        });
        break;
      case 'analytics':
        void navigate({ to: '/analytics-reports' });
        break;
      case 'members':
        void navigate({
          to: '/system/members',
          search: { search: '', tab: 'members', page: 1, pageSize: 10 },
        });
        break;
      case 'audit_log':
        void navigate({
          to: '/system/audit',
          search: { actor: '', action: '', page: 1, pageSize: 25 },
        });
        break;
      case 'system_config':
        void navigate({ to: '/system/config' });
        break;
    }
  };

  const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      void signOut().then(() => navigate({ to: '/login' }));
      return;
    }

    if (key === 'change-password') setPasswordOpen(true);
  };

  return (
    <>
      <SimulationBanner />
      <Layout className="portal-shell min-h-screen">
        {!isMobile ? (
          <PortalSidebar
            items={visibleItems}
            selectedKey={selectedKey}
            collapsed={collapsed}
            onNavigate={navigateToMenu}
          />
        ) : null}
        <Layout>
          <PortalTopbar
            isMobile={isMobile}
            collapsed={collapsed}
            userName={session.user.name}
            userMenuItems={userMenuItems}
            onUserMenuClick={handleUserMenu}
            onNavigationToggle={() =>
              isMobile
                ? setMobileNavOpen((value) => !value)
                : setCollapsed((value) => !value)
            }
            notifications={notifications}
          />
          <Content className="portal-content p-3 sm:p-4 md:p-6">
            <Breadcrumb
              className="mb-4"
              items={[{ title: t('breadcrumb.home') }, ...crumbs]}
            />
            <main className="portal-main shadow-soft rounded-2xl bg-white p-4 md:p-6">
              <Outlet />
            </main>
          </Content>
        </Layout>
        <PortalMobileNav
          open={mobileNavOpen}
          items={visibleItems}
          selectedKey={selectedKey}
          onClose={() => setMobileNavOpen(false)}
          onNavigate={navigateToMenu}
        />
      </Layout>
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  );
}
