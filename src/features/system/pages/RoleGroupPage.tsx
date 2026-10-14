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
  const [expandedKeys, setExpandedKeys] = useState<string[]>(
    groups.map((group) => group.id)
  );
  const [creating, setCreating] = useState(false);
  const [createParent, setCreateParent] = useState<PortalRole | undefined>();

  const selected = groups.find((group) => group.id === groupId) ?? groups[0];
  const select = (id: PortalRole | undefined) =>
    void navigate({ search: (previous) => ({ ...previous, groupId: id }) });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('roles.title')}
        description={t('roles.description')}
        actions={
          <>
            <PermissionGuard capability="role.create_root">
              <Button
                type="primary"
                onClick={() => {
                  setCreateParent(undefined);
                  setCreating(true);
                }}
              >
                {t('roles.add')}
              </Button>
            </PermissionGuard>
            <PermissionGuard capability="role.create">
              {selected?.level === 'system_admin' ? (
                <Button
                  onClick={() => {
                    setCreateParent(selected.id);
                    setCreating(true);
                  }}
                >
                  {t('roles.addChild')}
                </Button>
              ) : null}
            </PermissionGuard>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
        <PortalCard>
          <Tree
            blockNode
            expandedKeys={expandedKeys}
            onExpand={(keys) =>
              setExpandedKeys(
                keys.filter((key): key is string => typeof key === 'string')
              )
            }
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
      <PermissionGuard capability="role.create">
        <RoleGroupCreateModal
          templates={groups.filter((group) => group.level === 'system_admin')}
          open={creating}
          parentId={createParent}
          parentCapabilities={
            groups.find((group) => group.id === createParent)?.capabilities
          }
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            if (createParent) {
              setExpandedKeys((previous) => [
                ...new Set([...previous, createParent]),
              ]);
            }
            select(id);
          }}
        />
      </PermissionGuard>
    </div>
  );
}
