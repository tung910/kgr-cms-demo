import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, Popconfirm, Tooltip, message } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

import { deleteRoleGroup, updateRoleGroup } from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import type { RoleGroup } from '../schemas/systemSchemas';
import { systemErrorMessage } from '../utils/systemErrors';
import { RoleMatrix } from './RoleMatrix';

export interface RoleGroupEditorProps {
  group: RoleGroup;
  onDeleted: () => void;
}

// Remount (via `key`) when the selected group changes so the draft resets.
export function RoleGroupEditor({ group, onDeleted }: RoleGroupEditorProps) {
  const { t } = useTranslation('system');
  const { session, simulate } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(group.name);
  const allowed = group.parentCapabilities
    ? new Set(group.parentCapabilities)
    : undefined;
  // A child never keeps a capability its parent no longer holds.
  const [draft, setDraft] = useState<ReadonlySet<Capability>>(
    new Set(
      group.capabilities.filter(
        (capability) => !allowed || allowed.has(capability)
      )
    )
  );

  const canEdit =
    !!session &&
    hasCapability(session.role, 'role.update') &&
    !group.locked &&
    session.role !== group.id;
  const dirty =
    name !== group.name ||
    draft.size !== group.capabilities.length ||
    group.capabilities.some((capability) => !draft.has(capability));

  const saveMutation = useMutation({
    mutationFn: () =>
      updateRoleGroup({
        id: group.id,
        group: { name: name.trim(), capabilities: [...draft] },
      }),
    onSuccess: () => {
      void message.success(t('roles.editor.saved'));
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoleGroup(group.id),
    onSuccess: () => {
      void message.success(t('roles.editor.deleted'));
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
      onDeleted();
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  const simulateMutation = useMutation({
    mutationFn: () => simulate(group.id),
    // The simulated role may not see this page, so land on the dashboard.
    onSuccess: () => void navigate({ to: '/' }),
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  // Preset groups are deletable too; only Super Admin itself is fixed.
  const canDelete = group.id !== 'super_admin';
  const deleteBlocked = group.memberCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canEdit && !group.isSystem ? (
          <Input
            value={name}
            maxLength={100}
            aria-label={t('roles.editor.name')}
            className="max-w-xs"
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          <h2 className="m-0 text-lg font-semibold">{group.name}</h2>
        )}
        <div className="flex flex-wrap gap-2">
          <PermissionGuard capability="role.simulate">
            <Button
              loading={simulateMutation.isPending}
              disabled={session?.role === group.id}
              onClick={() => simulateMutation.mutate()}
            >
              {t('roles.editor.simulate')}
            </Button>
          </PermissionGuard>
          {canDelete ? (
            <PermissionGuard capability="role.delete">
              <Tooltip title={deleteBlocked ? t('roles.editor.inUse') : null}>
                <Popconfirm
                  title={t('roles.editor.deleteConfirm', { name: group.name })}
                  disabled={deleteBlocked}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteMutation.mutate()}
                >
                  <Button
                    danger
                    disabled={deleteBlocked}
                    loading={deleteMutation.isPending}
                  >
                    {t('roles.editor.delete')}
                  </Button>
                </Popconfirm>
              </Tooltip>
            </PermissionGuard>
          ) : null}
          {canEdit ? (
            <Button
              type="primary"
              disabled={!dirty || draft.size === 0 || !name.trim()}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {t('common.save')}
            </Button>
          ) : null}
        </div>
      </div>
      <Alert
        type={group.locked || !canEdit ? 'info' : 'warning'}
        showIcon
        message={
          group.locked
            ? t('roles.editor.lockedHint')
            : canEdit
              ? t('roles.editor.cumulativeHint')
              : t('roles.editor.readOnlyHint')
        }
      />
      <RoleMatrix
        value={draft}
        disabled={!canEdit}
        allowed={allowed}
        onChange={setDraft}
      />
    </div>
  );
}
