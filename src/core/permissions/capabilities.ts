import {
  SYSTEM_ROLES,
  type PortalRole,
  type SystemRole,
} from '@/core/auth/types';

// Capabilities are only split when two roles actually differ on them.
// Rows follow CMS_QnA_V1.xlsx, sheet "Phân quyền (v1)"; see
// docs/CMS_QnA_V1_SPEC.md for the source matrix and open questions.
export const CAPABILITIES = [
  // M01 dashboard: 1.1–1.3 are open to every role, only 1.4 is gated.
  // 1.3 export is split by content: TDS (factory) vs filter revenue (sales).
  'dashboard.tds.export',
  'dashboard.revenue.export',
  'dashboard.active.read',
  'dashboard.active.export',
  // M03 devices (3.x).
  'device.read',
  'device.pii.full',
  'device.edit_info',
  'device.export',
  'device.diagnose',
  'device.control',
  'device.control.read',
  'device.owner.update',
  'device.lifecycle',
  'device.history.read',
  'device.history.export',
  'device.inventory.sync',
  // M02 customers, warranty and field service (2.x).
  'customers.read',
  'customers.export',
  'customers.write',
  'customers.access_log',
  'warranty.read',
  'warranty.export',
  'warranty.update',
  'service.read',
  'service.write',
  'customer.notify',
  // OTA (4.x). Firmware is published by the factory but approved by admins.
  'ota.read',
  'ota.export',
  'firmware.write',
  'firmware.approve',
  'ota.campaign.create',
  'ota.campaign.update',
  'ota.campaign.control',
  // Device map (5.x).
  'device_map.read',
  'device_map.location.exact',
  'device_map.export',
  // Alert center (6.x).
  'alerts.read',
  'alerts.export',
  'alerts.handle',
  'alerts.notify',
  'alerts.config',
  // Marketing campaigns (7.x). No route yet — the matrix is seeded ahead of
  // the module so role groups do not have to be re-cut when it lands.
  'campaign.read',
  'campaign.write',
  'campaign.voucher.create',
  'campaign.voucher.update',
  'campaign.approve',
  'campaign.send',
  'campaign.export',
  'campaign.frequency.config',
  // Analytics and reporting (8.x).
  'analytics.read',
  'analytics.export',
  'analytics.reliability.read',
  'analytics.reliability.export',
  'analytics.revenue.export',
  'analytics.metric_config',
  // Filter-core QR serials (9.x).
  'serial.read',
  'serial.detail.read',
  'serial.write',
  'serial.export',
  'serial.void',
  'serial.void.delete',
  'serial.anomaly.export',
  // M04.1: write = lifespan, core kind and model layout (QTHT only);
  // tune = thresholds, TDS factors and campaigns (QTHT + VHKT).
  'core_config.write',
  'core_config.tune',
  // M10: accounts, role groups, role simulation, audit, config, backup.
  'member.read',
  'member.create',
  'member.update',
  'member.delete',
  'role.read',
  'role.create_root',
  'role.create',
  'role.update',
  'role.delete',
  'role.simulate',
  'audit.read',
  'audit.export',
  'config.read',
  'config.update',
  'security.config',
  'backup.read',
  'backup.run',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

// Default role matrix per CMS_QnA_V1.xlsx, sheet "Phân quyền (v1)". It only
// seeds the role groups: the live mapping is owned by the backend and
// registered at sign-in.
//
// Capability                   | super | admin | factory | svc ctr | sales | logistics | Sheet row
// -----------------------------+-------+-------+---------+---------+-------+-----------+----------
// dashboard.tds.export         |   ✓   |   ✓   |    ✓    |         |   ✓   |           | 1.3
// dashboard.revenue.export     |   ✓   |   ✓   |         |         |   ✓   |           | 1.3 note
// dashboard.active.read        |   ✓   |   ✓   |         |    ✓    |   ✓   |           | 1.4
// dashboard.active.export      |   ✓   |   ✓   |         |         |   ✓   |           | 1.4
// device.read                  |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 3.1/3.2/3.4
// device.pii.full              |   ✓   |   ✓   |         |    ✓    |       |           | 3.2 note
// device.edit_info             |   ✓   |   ✓   |         |         |       |           | no sheet row
// device.export                |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 3.3
// device.diagnose              |   ✓   |   ✓   |         |         |       |           | no sheet row
// device.control               |   ✓   |   ✓   |         |    ✓    |       |           | 3.4c
// device.control.read          |   ✓   |   ✓   |    ✓    |    ✓    |       |           | 3.4c (R)
// device.owner.update          |   ✓   |   ✓   |         |    ✓    |       |           | 3.4b
// device.lifecycle             |   ✓   |   ✓   |         |         |       |           | 3.4b (D)
// device.history.read          |   ✓   |   ✓   |    ✓    |    ✓    |       |           | 3.4d
// device.history.export        |   ✓   |   ✓   |    ✓    |         |       |           | 3.4d
// device.inventory.sync        |   ✓   |   ✓   |    ✓    |         |       |     ✓     | no sheet row
// customers.read               |   ✓   |   ✓   |         |    ✓    |   ✓   |           | 2.1/2.2b
// customers.export             |   ✓   |   ✓   |         |    ✓    |   ✓   |           | 2.1
// customers.write              |   ✓   |   ✓   |         |    ✓    |       |           | 2.2
// customers.access_log         |   ✓   |   ✓   |         |         |       |           | 2.2b note
// warranty.read                |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 2.3
// warranty.export              |   ✓   |   ✓   |         |    ✓    |       |           | 2.3
// warranty.update              |   ✓   |   ✓   |         |    ✓    |       |           | 2.3b
// service.read                 |   ✓   |   ✓   |         |    ✓    |   ✓   |     ✓     | 2.4
// service.write                |   ✓   |   ✓   |         |    ✓    |       |           | 2.4b
// customer.notify              |   ✓   |   ✓   |         |    ✓    |   ✓   |           | 2.5
// ota.read                     |   ✓   |   ✓   |    ✓    |    ✓    |       |           | 4.3/4.5
// ota.export                   |   ✓   |   ✓   |    ✓    |         |       |           | 4.3/4.5
// firmware.write               |   ✓   |       |    ✓    |         |       |           | 4.1
// firmware.approve             |   ✓   |   ✓   |         |         |       |           | 4.1b
// ota.campaign.create          |   ✓   |   ✓   |    ✓    |         |       |           | 4.2
// ota.campaign.update          |   ✓   |   ✓   |         |         |       |           | 4.2 note
// ota.campaign.control         |   ✓   |   ✓   |    ✓    |         |       |           | 4.4
// device_map.read              |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 5.1–5.4
// device_map.location.exact    |   ✓   |   ✓   |         |    ✓    |       |           | 5.5 note
// device_map.export            |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 5.6
// alerts.read                  |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |           | 6.1
// alerts.export                |   ✓   |   ✓   |    ✓    |    ✓    |       |           | 6.2
// alerts.handle                |   ✓   |   ✓   |         |    ✓    |       |           | 6.3
// alerts.notify                |   ✓   |   ✓   |         |    ✓    |       |           | 6.5 (S)
// alerts.config                |   ✓   |   ✓   |         |         |       |           | 6.4/6.5 (U)
// campaign.read                |   ✓   |   ✓   |         |    ✓    |   ✓   |           | 7.3/7.6
// campaign.write               |   ✓   |   ✓   |         |         |   ✓   |           | 7.1–7.3
// campaign.voucher.create      |   ✓   |   ✓   |         |         |   ✓   |           | 7.4
// campaign.voucher.update      |   ✓   |   ✓   |         |         |       |           | 7.4 note
// campaign.approve             |   ✓   |   ✓   |         |         |       |           | 7.5
// campaign.send                |   ✓   |   ✓   |         |         |       |           | 7.5 run/stop
// campaign.export              |   ✓   |   ✓   |         |         |   ✓   |           | 7.6
// campaign.frequency.config    |   ✓   |   ✓   |         |         |       |           | 7.5b cap
// analytics.read               |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 8.1–8.2
// analytics.export             |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 8.1–8.2
// analytics.reliability.read   |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |           | 8.3/8.5
// analytics.reliability.export |   ✓   |   ✓   |    ✓    |         |       |           | 8.3/8.5
// analytics.revenue.export     |   ✓   |   ✓   |         |         |   ✓   |           | 1.3/8.4
// analytics.metric_config      |   ✓   |   ✓   |         |         |       |           | 8.6
// serial.read                  |   ✓   |   ✓   |    ✓    |    ✓    |   ✓   |     ✓     | 9.1
// serial.detail.read           |   ✓   |   ✓   |    ✓    |    ✓    |       |     ✓     | 9.5–9.6
// serial.write                 |   ✓   |   ✓   |    ✓    |         |       |     ✓     | 9.2
// serial.export                |   ✓   |   ✓   |    ✓    |         |       |     ✓     | 9.4
// serial.void                  |   ✓   |   ✓   |    ✓    |         |       |     ✓     | 9.6b
// serial.void.delete           |   ✓   |       |         |         |       |           | 9.6b note
// serial.anomaly.export        |   ✓   |   ✓   |         |         |       |     ✓     | 9.7
// core_config.write            |   ✓   |   ✓   |    ✓    |         |   ✓   |           | 9.3
// core_config.tune             |   ✓   |   ✓   |         |         |       |           | no sheet row
// member.read/create/update    |   ✓   |   ✓   |         |         |       |           | 10.1/10.1b
// member.delete                |   ✓   |       |         |         |       |           | 10.1c
// role.read                    |   ✓   |   ✓   |         |         |       |           | 10.2
// role.create_root/delete/simulate  |   ✓   |       |         |         |       |           | 10.2/10.3
// audit.read/export            |   ✓   |   ✓   |         |         |       |           | 10.5
// config.read                  |   ✓   |   ✓   |    ✓    |    ✓    |       |           | 10.6
// config.update                |   ✓   |   ✓   |         |         |       |           | 10.6
// security.config              |   ✓   |       |         |         |       |           | 10.4
// backup.read/run              |   ✓   |       |         |         |       |           | 10.6b
//
// Menus follow capabilities through MENU_CAPABILITY (overview is always open).
//
// ⚠️ Open questions carried from the sheet (docs/CMS_QnA_V1_SPEC.md):
// - 5.5 ticks R for all six roles but its note restricts sales to province
//   level and drops factory. Modelled here as a separate capability held by
//   super/admin/service_center; needs business confirmation.
// - 10.2: Super Admin manages roots; System Admin manages its own children.
// - device.edit_info, device.diagnose and core_config.tune have no sheet row
//   and keep their previous assignment.
// - device.inventory.sync (Tồn kho "Đồng bộ") has no sheet row: assumed for
//   the roles that produce or hold stock (factory, logistics) plus admins.
//
// ⚠️ M10 assumption (plan roles ↔ sheet roles): Super Admin ≙ super_admin,
// Admin ≙ admin, Nhà máy ≙ factory, TT DV ≙ service_center,
// KD ≙ sales, Kho vận ≙ logistics. Needs business confirmation.
export const ROLE_CAPABILITIES: Record<SystemRole, readonly Capability[]> = {
  super_admin: CAPABILITIES,
  admin: [
    'dashboard.tds.export',
    'dashboard.revenue.export',
    'dashboard.active.read',
    'dashboard.active.export',
    'device.read',
    'device.pii.full',
    'device.edit_info',
    'device.export',
    'device.diagnose',
    'device.control',
    'device.control.read',
    'device.owner.update',
    'device.lifecycle',
    'device.history.read',
    'device.history.export',
    'device.inventory.sync',
    'customers.read',
    'customers.export',
    'customers.write',
    'customers.access_log',
    'warranty.read',
    'warranty.export',
    'warranty.update',
    'service.read',
    'service.write',
    'customer.notify',
    'ota.read',
    'ota.export',
    'firmware.approve',
    'ota.campaign.create',
    'ota.campaign.update',
    'ota.campaign.control',
    'device_map.read',
    'device_map.location.exact',
    'device_map.export',
    'alerts.read',
    'alerts.export',
    'alerts.handle',
    'alerts.notify',
    'alerts.config',
    'campaign.read',
    'campaign.write',
    'campaign.voucher.create',
    'campaign.voucher.update',
    'campaign.approve',
    'campaign.send',
    'campaign.export',
    'campaign.frequency.config',
    'analytics.read',
    'analytics.export',
    'analytics.reliability.read',
    'analytics.reliability.export',
    'analytics.revenue.export',
    'analytics.metric_config',
    'serial.read',
    'serial.detail.read',
    'serial.write',
    'serial.export',
    'serial.void',
    'serial.anomaly.export',
    'core_config.write',
    'core_config.tune',
    'member.read',
    'member.create',
    'member.update',
    'role.read',
    'audit.read',
    'audit.export',
    'config.read',
    'config.update',
  ],
  service_center: [
    'dashboard.active.read',
    'device.read',
    'device.pii.full',
    'device.export',
    'device.control',
    'device.control.read',
    'device.owner.update',
    'device.history.read',
    'customers.read',
    'customers.export',
    'customers.write',
    'warranty.read',
    'warranty.export',
    'warranty.update',
    'service.read',
    'service.write',
    'customer.notify',
    'ota.read',
    'device_map.read',
    'device_map.location.exact',
    'device_map.export',
    'alerts.read',
    'alerts.export',
    'alerts.handle',
    'alerts.notify',
    'campaign.read',
    'analytics.read',
    'analytics.export',
    'analytics.reliability.read',
    'serial.read',
    'serial.detail.read',
    'config.read',
  ],
  sales: [
    'dashboard.tds.export',
    'dashboard.revenue.export',
    'dashboard.active.read',
    'dashboard.active.export',
    'device.read',
    'device.export',
    'customers.read',
    'customers.export',
    'warranty.read',
    'service.read',
    'customer.notify',
    'device_map.read',
    'device_map.export',
    'alerts.read',
    'campaign.read',
    'campaign.write',
    'campaign.voucher.create',
    'campaign.export',
    'analytics.read',
    'analytics.export',
    'analytics.reliability.read',
    'analytics.revenue.export',
    'serial.read',
    'core_config.write',
  ],
  factory: [
    'dashboard.tds.export',
    'device.read',
    'device.export',
    'device.control.read',
    'device.history.read',
    'device.history.export',
    'device.inventory.sync',
    'warranty.read',
    'ota.read',
    'ota.export',
    'firmware.write',
    'ota.campaign.create',
    'ota.campaign.control',
    'device_map.read',
    'device_map.export',
    'alerts.read',
    'alerts.export',
    'analytics.read',
    'analytics.export',
    'analytics.reliability.read',
    'analytics.reliability.export',
    'serial.read',
    'serial.detail.read',
    'serial.write',
    'serial.export',
    'serial.void',
    'core_config.write',
    'config.read',
  ],
  logistics: [
    'device.read',
    'device.export',
    'device.inventory.sync',
    'warranty.read',
    'service.read',
    'device_map.read',
    'device_map.export',
    'analytics.read',
    'analytics.export',
    'serial.read',
    'serial.detail.read',
    'serial.write',
    'serial.export',
    'serial.void',
    'serial.anomaly.export',
  ],
};

export const PORTAL_MENU_KEYS = [
  'overview',
  'devices',
  'ota',
  'alerts',
  'device_map',
  'customers',
  'campaigns',
  'serials',
  'analytics',
  'members',
  'role_groups',
  'audit_log',
  'system_config',
] as const;

export type PortalMenuKey = (typeof PORTAL_MENU_KEYS)[number];

// A menu is visible exactly when the role holds its read capability, so the
// menu matrix cannot drift from the capability matrix.
//
// ⚠️ Gap: sheet rows 2.3/2.4 give factory and logistics serial-based warranty
// lookup and read access to the service schedule, but CustomersPage renders
// the customer list with no inner gate, so opening this menu on warranty.read
// would leak PII to them. The menu stays on customers.read until warranty
// lookup and the service schedule are split into their own routes.
export const MENU_CAPABILITY: Record<PortalMenuKey, Capability | null> = {
  overview: null,
  devices: 'device.read',
  ota: 'ota.read',
  alerts: 'alerts.read',
  device_map: 'device_map.read',
  customers: 'customers.read',
  campaigns: 'campaign.read',
  serials: 'serial.read',
  analytics: 'analytics.read',
  members: 'member.read',
  role_groups: 'role.read',
  audit_log: 'audit.read',
  system_config: 'config.read',
};

const roleCapabilities = new Map<PortalRole, readonly Capability[]>(
  SYSTEM_ROLES.map((role) => [role, ROLE_CAPABILITIES[role]])
);

// Role groups are editable at runtime (M10), so the backend's mapping replaces
// the defaults above whenever a session is created, restored or simulated.
export function registerRoleCapabilities(
  role: PortalRole,
  capabilities: readonly Capability[]
): void {
  roleCapabilities.set(role, capabilities);
}

export function hasCapability(
  role: PortalRole,
  capability: Capability
): boolean {
  return roleCapabilities.get(role)?.includes(capability) ?? false;
}

export function hasMenuAccess(role: PortalRole, menu: PortalMenuKey): boolean {
  const capability = MENU_CAPABILITY[menu];
  return capability === null || hasCapability(role, capability);
}
