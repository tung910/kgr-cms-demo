import type { Capability } from './capabilities';

// M10 SCR-04 matrix: function × action, each cell backed by one capability.
// Rows and actions mirror CMS_QnA_V1.xlsx, sheet "Phân quyền (v1)".
export const PERMISSION_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'export',
  'send',
  'approve',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface PermissionFunction {
  key: string;
  module: string;
  cells: Partial<Record<PermissionAction, Capability>>;
}

export const PERMISSION_CATALOG: readonly PermissionFunction[] = [
  {
    key: 'dashboard_tds',
    module: 'dashboard',
    cells: { export: 'dashboard.tds.export' },
  },
  {
    key: 'dashboard_revenue',
    module: 'dashboard',
    cells: { export: 'dashboard.revenue.export' },
  },
  {
    key: 'dashboard_active',
    module: 'dashboard',
    cells: {
      read: 'dashboard.active.read',
      export: 'dashboard.active.export',
    },
  },
  {
    key: 'device_list',
    module: 'devices',
    cells: { read: 'device.read', export: 'device.export' },
  },
  {
    key: 'device_owner',
    module: 'devices',
    cells: {
      read: 'device.pii.full',
      update: 'device.owner.update',
      delete: 'device.lifecycle',
    },
  },
  {
    key: 'device_info',
    module: 'devices',
    cells: { update: 'device.edit_info' },
  },
  {
    key: 'device_diagnose',
    module: 'devices',
    cells: { send: 'device.diagnose' },
  },
  {
    key: 'device_control',
    module: 'devices',
    cells: { read: 'device.control.read', send: 'device.control' },
  },
  {
    key: 'device_inventory',
    module: 'devices',
    cells: { update: 'device.inventory.sync' },
  },
  {
    key: 'device_history',
    module: 'devices',
    cells: { read: 'device.history.read', export: 'device.history.export' },
  },
  {
    key: 'customers',
    module: 'customers',
    cells: {
      read: 'customers.read',
      create: 'customers.write',
      update: 'customers.write',
      export: 'customers.export',
    },
  },
  {
    key: 'customer_access_log',
    module: 'customers',
    cells: { read: 'customers.access_log' },
  },
  {
    key: 'warranty',
    module: 'customers',
    cells: {
      read: 'warranty.read',
      update: 'warranty.update',
      export: 'warranty.export',
    },
  },
  {
    key: 'service_schedule',
    module: 'customers',
    cells: {
      read: 'service.read',
      create: 'service.write',
      update: 'service.write',
    },
  },
  {
    key: 'customer_notify',
    module: 'customers',
    cells: { send: 'customer.notify' },
  },
  {
    key: 'ota',
    module: 'ota',
    cells: { read: 'ota.read', export: 'ota.export' },
  },
  {
    key: 'firmware',
    module: 'ota',
    cells: {
      create: 'firmware.write',
      update: 'firmware.write',
      approve: 'firmware.approve',
    },
  },
  {
    key: 'ota_campaign',
    module: 'ota',
    cells: {
      create: 'ota.campaign.create',
      update: 'ota.campaign.update',
      send: 'ota.campaign.control',
    },
  },
  {
    key: 'device_map',
    module: 'device_map',
    cells: { read: 'device_map.read', export: 'device_map.export' },
  },
  {
    key: 'device_map_location',
    module: 'device_map',
    cells: { read: 'device_map.location.exact' },
  },
  {
    key: 'alerts',
    module: 'alerts',
    cells: {
      read: 'alerts.read',
      update: 'alerts.handle',
      export: 'alerts.export',
      send: 'alerts.notify',
    },
  },
  {
    key: 'alert_config',
    module: 'alerts',
    cells: { update: 'alerts.config' },
  },
  {
    key: 'campaign',
    module: 'campaigns',
    cells: {
      read: 'campaign.read',
      create: 'campaign.write',
      update: 'campaign.write',
      export: 'campaign.export',
      approve: 'campaign.approve',
    },
  },
  {
    key: 'campaign_voucher',
    module: 'campaigns',
    cells: {
      create: 'campaign.voucher.create',
      update: 'campaign.voucher.update',
    },
  },
  {
    key: 'analytics',
    module: 'analytics',
    cells: { read: 'analytics.read', export: 'analytics.export' },
  },
  {
    key: 'analytics_reliability',
    module: 'analytics',
    cells: {
      read: 'analytics.reliability.read',
      export: 'analytics.reliability.export',
    },
  },
  {
    key: 'analytics_revenue',
    module: 'analytics',
    cells: { export: 'analytics.revenue.export' },
  },
  {
    key: 'analytics_metric_config',
    module: 'analytics',
    cells: { update: 'analytics.metric_config' },
  },
  {
    key: 'serial',
    module: 'serials',
    cells: {
      read: 'serial.read',
      create: 'serial.write',
      export: 'serial.export',
    },
  },
  {
    key: 'serial_detail',
    module: 'serials',
    cells: { read: 'serial.detail.read' },
  },
  {
    key: 'serial_void',
    module: 'serials',
    cells: { update: 'serial.void', delete: 'serial.void.delete' },
  },
  {
    key: 'serial_anomaly',
    module: 'serials',
    cells: { export: 'serial.anomaly.export' },
  },
  {
    key: 'core_config_lifespan',
    module: 'serials',
    cells: { update: 'core_config.write' },
  },
  {
    key: 'core_config_tune',
    module: 'serials',
    cells: { update: 'core_config.tune' },
  },
  {
    key: 'member',
    module: 'system',
    cells: {
      read: 'member.read',
      create: 'member.create',
      update: 'member.update',
      delete: 'member.delete',
    },
  },
  {
    key: 'role_group',
    module: 'system',
    cells: {
      read: 'role.read',
      create: 'role.create',
      update: 'role.update',
      delete: 'role.delete',
    },
  },
  {
    key: 'role_simulate',
    module: 'system',
    cells: { read: 'role.simulate' },
  },
  {
    key: 'audit_log',
    module: 'system',
    cells: { read: 'audit.read', export: 'audit.export' },
  },
  {
    key: 'system_config',
    module: 'system',
    cells: { read: 'config.read', update: 'config.update' },
  },
  {
    key: 'security_config',
    module: 'system',
    cells: { update: 'security.config' },
  },
  {
    key: 'backup',
    module: 'system',
    cells: { read: 'backup.read', send: 'backup.run' },
  },
];

// Cumulative rule (plan [PQ!B5]): any non-read action in a row implies read.
export function applyCumulativeRead(
  selected: ReadonlySet<Capability>
): Set<Capability> {
  const next = new Set(selected);
  for (const fn of PERMISSION_CATALOG) {
    const read = fn.cells.read;
    if (!read) continue;
    const others = Object.entries(fn.cells).filter(
      ([action]) => action !== 'read'
    );
    if (others.some(([, capability]) => next.has(capability))) next.add(read);
  }
  return next;
}
