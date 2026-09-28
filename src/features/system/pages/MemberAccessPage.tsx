import { Tabs } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';

import type { MemberAccessSearch } from '../schemas/systemSchemas';
import { MemberListPage } from './MemberListPage';
import { RoleGroupPage } from './RoleGroupPage';

export interface MemberAccessPageProps {
  search: MemberAccessSearch;
}

// Members and role groups share one screen; each tab is hidden without its
// read capability.
export function MemberAccessPage({ search }: MemberAccessPageProps) {
  const { t } = useTranslation('system');
  const { session } = useAuth();
  const navigate = useNavigate({ from: '/system/members' });
  const can = (capability: Parameters<typeof hasCapability>[1]) =>
    !!session && hasCapability(session.role, capability);

  const items = [
    can('member.read') && {
      key: 'members',
      label: t('members.title'),
      children: <MemberListPage filters={search} />,
    },
    can('role.read') && {
      key: 'roles',
      label: t('roles.title'),
      children: <RoleGroupPage groupId={search.groupId} />,
    },
  ].filter((item) => item !== false);

  return (
    <Tabs
      activeKey={
        items.some((i) => i.key === search.tab) ? search.tab : undefined
      }
      items={items}
      onChange={(tab) =>
        void navigate({
          search: (previous) => ({
            ...previous,
            tab: tab as 'members' | 'roles',
          }),
        })
      }
    />
  );
}
