import type { PortalRole, SystemRole } from '@/core/auth/types';
import {
  CAPABILITIES,
  ROLE_CAPABILITIES,
  type Capability,
} from '@/core/permissions/capabilities';

import type { AccountLevel, SystemConfigDto } from '../schemas/systemSchemas';

// Mock data only (development MSW): business names and phone numbers are not
// translated. Every seeded account signs in with `mockPassword`.
export const mockPassword = 'Kgr@12345';

export interface MemberSeed {
  id: string;
  fullName: string;
  phone: string;
  roleId: PortalRole;
  level: AccountLevel;
  // Creator. For an Admin lĩnh vực it is also the owning System Admin.
  parentId: string | null;
  locked?: boolean;
  // Login screen label (dev only).
  demoLabel?: string;
}

// System Admin: everything except what stays with SP-Admin.
const SP_ONLY: readonly Capability[] = [
  'member.delete',
  'role.create_root',
  'role.delete',
  'role.simulate',
  'serial.void.delete',
  'security.config',
  'backup.read',
  'backup.run',
];

// The `admin` group is the System Admin: wide enough that every Admin lĩnh vực
// group below it stays a subset (mock seed; the default matrix is untouched).
export const SYSTEM_ADMIN_CAPABILITIES: Capability[] = CAPABILITIES.filter(
  (cap) => !SP_ONLY.includes(cap)
);

export interface GroupSeed {
  id: PortalRole;
  name: string;
  parentId: PortalRole | null;
  capabilities: Capability[];
  // Set on a System Admin's own group; otherwise derived from parentId.
  level?: AccountLevel;
}

const memberAdmin: Capability[] = [
  'member.read',
  'member.create',
  'member.update',
];

// Every System Admin owns a group (ticked by SP-Admin) and, below it, the
// Admin lĩnh vực groups managed within its branch.
const sysAdminGroup = (n: string, name: string): GroupSeed => ({
  id: `custom:sys-${n}`,
  name,
  parentId: null,
  level: 'system_admin',
  capabilities: SYSTEM_ADMIN_CAPABILITIES,
});

const fieldAdminGroup = (
  key: string,
  owner: string,
  name: string,
  base: SystemRole
): GroupSeed => ({
  id: `custom:admin-${key}-${owner}`,
  name,
  parentId: `custom:sys-${owner}`,
  capabilities: [...new Set([...ROLE_CAPABILITIES[base], ...memberAdmin])],
});

export const seedGroups: GroupSeed[] = [
  sysAdminGroup('1', 'System Admin 01'),
  sysAdminGroup('2', 'System Admin 02'),
  fieldAdminGroup('sales', '1', 'Kinh doanh', 'sales'),
  fieldAdminGroup('logistics', '1', 'Kho vận', 'logistics'),
  fieldAdminGroup('service_center', '1', 'TTDV', 'service_center'),
  fieldAdminGroup('sales', '2', 'Kinh doanh', 'sales'),
  fieldAdminGroup('factory', '2', 'Nhà máy', 'factory'),
];

const sysAdmin = (
  id: string,
  fullName: string,
  phone: string,
  n: string
): MemberSeed => ({
  id,
  fullName,
  phone,
  roleId: `custom:sys-${n}`,
  level: 'system_admin',
  parentId: 'u-super_admin',
});

const fieldAdmin = (
  id: string,
  fullName: string,
  phone: string,
  roleKey: string,
  parentId: string
): MemberSeed => ({
  id,
  fullName,
  phone,
  roleId: `custom:admin-${roleKey}`,
  level: 'field_admin',
  parentId,
});

// Mirrors the sample tree: SP-Admin → 2 System Admin → Admin lĩnh vực (end users removed with the top-level TT DV/Nhà máy/KD/Kho vận groups).
export const demoMemberSeeds: MemberSeed[] = [
  {
    id: 'u-super_admin',
    fullName: 'Nguyễn Văn An',
    phone: '0901000001',
    roleId: 'super_admin',
    level: 'sp_admin',
    parentId: null,
    demoLabel: 'SP-Admin',
  },
  {
    ...sysAdmin('u-sys-1', 'Trần Thị Bình', '0901000002', '1'),
    demoLabel: 'System Admin 01',
  },
  {
    ...sysAdmin('u-sys-2', 'Lê Quang Đạt', '0901000007', '2'),
    demoLabel: 'System Admin 02',
  },
  {
    ...fieldAdmin(
      'u-fa-kd-1',
      'Admin Kinh doanh 01',
      '0901000011',
      'sales-1',
      'u-sys-1'
    ),
    demoLabel: 'Admin Kinh doanh 01',
  },
  fieldAdmin(
    'u-fa-kho-1',
    'Admin Kho vận 01',
    '0901000012',
    'logistics-1',
    'u-sys-1'
  ),
  fieldAdmin(
    'u-fa-ttdv-1',
    'Admin TTDV 01',
    '0901000013',
    'service_center-1',
    'u-sys-1'
  ),
  fieldAdmin(
    'u-fa-kd-2',
    'Admin Kinh doanh 02',
    '0901000014',
    'sales-2',
    'u-sys-2'
  ),
  fieldAdmin(
    'u-fa-nm-1',
    'Admin Nhà máy 01',
    '0901000015',
    'factory-2',
    'u-sys-2'
  ),
];

export const extraMemberSeeds: MemberSeed[] = [];

export const configFixture: SystemConfigDto = {
  params: {
    campaign_core_days: 15,
    campaign_quiet_start_hour: 21,
    campaign_quiet_end_hour: 8,
    campaign_frequency_limit: 3,
    campaign_frequency_days: 7,
    campaign_attribution_days: 7,
    campaign_cooldown_days: 30,
    campaign_repurchase_days: 180,
    campaign_booking_revenue: 450000,
    campaign_qr_revenue: 320000,
    tds_threshold_region: 55,
    ota_auto_pause_rate: 5,
    device_ack_timeout: 30,
    // ❓ Q-29: the plan gives no SLA defaults, so they start unset.
    sla_by_severity: { critical: null, medium: null, low: null },
    warranty_expiring_days: 30,
    // ⚠️ Plan says "VD 2%": example value, needs confirmation (U4).
    qr_anomaly_rate: 2,
    alert_auto_close: false,
    // ⚠️ Q-45 defaults: 5 attempts, 15 minute lock, 30 minute idle session.
    login_max_failed: 5,
    lockout_minutes: 15,
    session_timeout_minutes: 30,
    password_min_length: 8,
  },
  catalogs: {
    model: [
      { code: 'KG-RO-10', name: 'Kangaroo RO 10 cores', parent_code: null },
      { code: 'KG-RO-9', name: 'Kangaroo RO 9 cores', parent_code: null },
    ],
    core: [
      { code: 'CORE-PP', name: 'PP cotton', parent_code: null },
      { code: 'CORE-RO', name: 'RO membrane', parent_code: null },
    ],
    region: [
      { code: 'HN', name: 'Hà Nội', parent_code: null },
      { code: 'HN-BD', name: 'Ba Đình', parent_code: 'HN' },
      { code: 'HCM', name: 'TP. Hồ Chí Minh', parent_code: null },
      { code: 'DN', name: 'Đà Nẵng', parent_code: null },
    ],
  },
  updated_at: '2026-09-01T08:00:00.000Z',
};
