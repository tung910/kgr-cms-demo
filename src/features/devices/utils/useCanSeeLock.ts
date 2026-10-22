import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';

// §3.4c (R): the lock state is visible only with device.control.read.
export function useCanSeeLock(): boolean {
  const { session } = useAuth();
  return Boolean(session && hasCapability(session.role, 'device.control.read'));
}
