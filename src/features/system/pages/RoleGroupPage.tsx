import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { PortalRole } from '@/core/auth/types';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalCard, PortalPageHeader } from '@/shared/components/portal';

import { RoleGroupCreateModal } from '../components/RoleGroupCreateModal';
import { RoleGroupEditor } from '../components/RoleGroupEditor';
import { systemQueries } from '../queries/systemQueries';
import type { RoleGroup } from '../schemas/systemSchemas';

// Groups nest under `parentId` (a System Admin's group holds its Admin lĩnh vực groups).
function buildGroupNodes(groups: RoleGroup[]): DataNode[] {
  const toNode = (group: RoleGroup): DataNode => ({
    key: group.id,
    title: (
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{group.name}</span>
        <span className="text-xs opacity-70">{group.memberCount}</span>
      </span>
    ),
    children: groups.filter((child) => child.parentId === group.id).map(toNode),
  });
  const ids = new Set(groups.map((group) => group.id));
  return groups
    .filter((group) => !group.parentId || !ids.has(group.parentId))
    .map(toNode);
}

export interface RoleGroupPageProps {
  groupId: PortalRole | undefined;
}

export function RoleGroupPage({ groupId }: RoleGroupPageProps) {
  const { t } = useTranslation('system');
  const navigate = useNavigate({ from: '/system/members' });
  const { data } = useSuspenseQuery(systemQueries.roleGroups());
  // The Super Admin group is fixed (all permissions), so its matrix is hidden.
  const groups = data.filter((group) => !group.locked);
  const [creating, setCreating] = useState(false);

  const selected = groups.find((group) => group.id === groupId) ?? groups[0];
  const select = (id: PortalRole | undefined) =>
    void navigate({ search: (previous) => ({ ...previous, groupId: id }) });
  // SP-Admin sees System Admin groups and adds top-level ones; a System Admin
  // only sees its field groups, so a new one sits under the selected's parent.
  const createParent = groups.some((group) => group.level === 'system_admin')
    ? undefined
    : (selected?.parentId ?? undefined);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('roles.title')}
        description={t('roles.description')}
        actions={
          <PermissionGuard capability="role.create">
            <Button type="primary" onClick={() => setCreating(true)}>
              {t('roles.add')}
            </Button>
          </PermissionGuard>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
        <PortalCard>
          <Tree
            blockNode
            defaultExpandAll
            treeData={buildGroupNodes(groups)}
            selectedKeys={selected ? [selected.id] : []}
            onSelect={(keys) => {
              const [key] = keys;
              if (typeof key === 'string') select(key as PortalRole);
            }}
          />
        </PortalCard>
        <PortalCard>
          {selected ? (
            <RoleGroupEditor
              key={`${selected.id}:${selected.capabilities.join()}:${selected.name}`}
              group={selected}
              onDeleted={() => select(undefined)}
            />
          ) : null}
        </PortalCard>
      </div>
      <RoleGroupCreateModal
        open={creating}
        parentId={createParent}
        onClose={() => setCreating(false)}
        onCreated={select}
      />
    </div>
  );
}
