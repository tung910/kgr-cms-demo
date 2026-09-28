import type { Capability } from '@/core/permissions/capabilities';

// 6 system roles per docs/CMS_QnA_V1_SPEC.md "Ký hiệu quyền" (QTHT/VHKT/CSKH/KSX/KD/XEM).
// Super Admins can add custom role groups (M10 SCR-04); their id is `custom:<id>`.
export const SYSTEM_ROLES = [
  'super_admin',
  'admin',
  'service_center',
  'factory',
  'sales',
  'logistics',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type PortalRole = SystemRole | `custom:${string}`;

export function isPortalRole(value: unknown): value is PortalRole {
  return (
    typeof value === 'string' &&
    (SYSTEM_ROLES.some((role) => role === value) ||
      (value.startsWith('custom:') && value.length > 'custom:'.length))
  );
}

export interface AuthSession {
  user: { id: string; name: string; phone: string };
  // Effective role: the simulated role while `simulatedFrom` is set.
  role: PortalRole;
  roleName: string;
  capabilities: readonly Capability[];
  idleTimeoutMinutes: number;
  simulatedFrom: { role: PortalRole; name: string } | null;
}

export interface SignInCredentials {
  phone: string;
  password: string;
}

export interface AuthAdapter {
  restore(): Promise<AuthSession | null>;
  signIn(credentials: SignInCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  // `null` ends the simulation. Super Admin only, read-only while active.
  simulate(role: PortalRole | null): Promise<AuthSession>;
}
