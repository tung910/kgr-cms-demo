import { Checkbox, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { Capability } from '@/core/permissions/capabilities';
import {
  PERMISSION_ACTIONS,
  PERMISSION_CATALOG,
  applyCumulativeRead,
  type PermissionAction,
  type PermissionFunction,
} from '@/core/permissions/permissionCatalog';

export interface RoleMatrixProps {
  value: ReadonlySet<Capability>;
  disabled: boolean;
  // Capabilities the parent group holds; anything else is hidden, since a
  // child group can never exceed its parent. Undefined = top-level group.
  allowed?: ReadonlySet<Capability> | undefined;
  onChange: (next: Set<Capability>) => void;
}

function rowCapabilities(fn: PermissionFunction): Capability[] {
  return Object.values(fn.cells);
}

export function RoleMatrix({
  value,
  disabled,
  allowed,
  onChange,
}: RoleMatrixProps) {
  const { t } = useTranslation('system');

  const toggle = (
    fn: PermissionFunction,
    action: PermissionAction,
    checked: boolean
  ) => {
    const capability = fn.cells[action];
    if (!capability) return;

    const next = new Set(value);
    if (checked) {
      next.add(capability);
      onChange(applyCumulativeRead(next));
      return;
    }
    // Clearing read clears the whole row; other actions just clear themselves.
    if (action === 'read') rowCapabilities(fn).forEach((c) => next.delete(c));
    else next.delete(capability);
    onChange(next);
  };

  const columns: ColumnsType<PermissionFunction> = [
    {
      title: t('roles.matrix.module'),
      dataIndex: 'module',
      key: 'module',
      width: 140,
      onCell: (fn, index) => {
        const previous = index === undefined ? undefined : rows[index - 1];
        if (previous?.module === fn.module) return { rowSpan: 0 };
        return {
          rowSpan: rows.filter((item) => item.module === fn.module).length,
        };
      },
      render: (module: string) => t(`roles.matrix.modules.${module}`),
    },
    {
      title: t('roles.matrix.function'),
      key: 'function',
      render: (_: unknown, fn) => t(`roles.matrix.functions.${fn.key}`),
    },
    ...PERMISSION_ACTIONS.map((action) => ({
      title: t(`roles.matrix.actions.${action}`),
      key: action,
      align: 'center' as const,
      width: 90,
      render: (_: unknown, fn: PermissionFunction) => {
        const capability = fn.cells[action];
        if (!capability) return <span className="text-[#B0B1B3]">—</span>;
        if (allowed && !allowed.has(capability)) return null;

        // Read is forced on (and locked) while any other action is granted.
        const forcedRead =
          action === 'read' &&
          rowCapabilities(fn).some((c) => c !== capability && value.has(c));

        return (
          <Checkbox
            checked={value.has(capability)}
            disabled={disabled || forcedRead}
            aria-label={`${t(`roles.matrix.functions.${fn.key}`)} — ${t(`roles.matrix.actions.${action}`)}`}
            onChange={(event) => toggle(fn, action, event.target.checked)}
          />
        );
      },
    })),
  ];

  // Rows the parent holds nothing of disappear altogether.
  const rows = PERMISSION_CATALOG.filter(
    (fn) => !allowed || rowCapabilities(fn).some((c) => allowed.has(c))
  );

  return (
    <Table<PermissionFunction>
      rowKey="key"
      size="small"
      bordered
      pagination={false}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
    />
  );
}
