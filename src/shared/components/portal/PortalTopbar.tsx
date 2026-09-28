import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Segmented, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';

import { setLanguage } from '@/core/i18n/languagePreference';

const { Header } = Layout;

export interface PortalTopbarProps {
  isMobile: boolean;
  collapsed: boolean;
  userName: string;
  userMenuItems: MenuProps['items'];
  onUserMenuClick: MenuProps['onClick'];
  onNavigationToggle: () => void;
}

export function PortalTopbar({
  isMobile,
  collapsed,
  userName,
  userMenuItems,
  onUserMenuClick,
  onNavigationToggle,
}: PortalTopbarProps) {
  const { t, i18n } = useTranslation('common');
  const opensNavigation = isMobile || collapsed;
  const currentLanguage = i18n.language.startsWith('vi') ? 'vi' : 'en';

  return (
    <Header className="portal-header sticky top-0 z-10 flex items-center justify-between px-4 md:px-6">
      <Button
        type="text"
        aria-label={
          opensNavigation ? t('topbar.openNav') : t('topbar.collapseNav')
        }
        icon={opensNavigation ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onNavigationToggle}
      />
      <div className="flex items-center gap-3">
        <Segmented
          value={currentLanguage}
          onChange={(value) => setLanguage(value as 'en' | 'vi')}
          options={[
            { label: t('languageSwitcher.en'), value: 'en' },
            { label: t('languageSwitcher.vi'), value: 'vi' },
          ]}
        />
        <Dropdown
          menu={{ items: userMenuItems, onClick: onUserMenuClick }}
          placement="bottomRight"
        >
          <Button type="text" className="flex h-auto items-center gap-2">
            <Avatar icon={<UserOutlined />} />
            <span className="hidden text-left sm:inline">
              <Typography.Text strong>{userName}</Typography.Text>
            </span>
          </Button>
        </Dropdown>
      </div>
    </Header>
  );
}
