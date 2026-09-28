import type { ReactNode } from 'react';

import { useAuth } from '@/core/auth/useAuth';

import { hasCapability, type Capability } from './capabilities';

export interface PermissionGuardProps {
  capability: Capability;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  capability,
  fallback = null,
  children,
}: PermissionGuardProps): ReactNode {
  const { session } = useAuth();

  if (!session || !hasCapability(session.role, capability)) {
    return fallback;
  }

  return children;
}
