import { z } from 'zod';

import { apiClient } from '@/core/api/apiClient';
import { ApiError } from '@/core/api/error';
import {
  CAPABILITIES,
  registerRoleCapabilities,
} from '@/core/permissions/capabilities';

import {
  isPortalRole,
  type AuthAdapter,
  type AuthSession,
  type PortalRole,
  type SignInCredentials,
} from './types';

const roleSchema = z.custom<PortalRole>(isPortalRole);

const sessionDtoSchema = z.object({
  user: z.object({ id: z.string(), full_name: z.string(), phone: z.string() }),
  role_id: roleSchema,
  role_name: z.string(),
  capabilities: z.array(z.enum(CAPABILITIES)),
  idle_timeout_minutes: z.number().positive(),
  simulated_from: z
    .object({ role_id: roleSchema, name: z.string() })
    .nullable(),
});

function toSession(raw: unknown): AuthSession {
  const parsed = sessionDtoSchema.safeParse(raw);

  if (!parsed.success) {
    throw new ApiError(
      'invalidResponse',
      'The server returned an invalid session response.'
    );
  }

  const dto = parsed.data;
  registerRoleCapabilities(dto.role_id, dto.capabilities);

  return {
    user: { id: dto.user.id, name: dto.user.full_name, phone: dto.user.phone },
    role: dto.role_id,
    roleName: dto.role_name,
    capabilities: dto.capabilities,
    idleTimeoutMinutes: dto.idle_timeout_minutes,
    simulatedFrom: dto.simulated_from
      ? { role: dto.simulated_from.role_id, name: dto.simulated_from.name }
      : null,
  };
}

// Talks to the backend session endpoints; the mock backend lives in MSW
// (features/system/mocks). Swap this adapter to integrate a real IdP.
export const httpAuthAdapter: AuthAdapter = {
  async restore() {
    try {
      return toSession(await apiClient.get<unknown>('/auth/session'));
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthenticated') {
        return null;
      }
      throw error;
    }
  },

  async signIn({ phone, password }: SignInCredentials) {
    return toSession(
      await apiClient.post<unknown>('/auth/login', { phone, password })
    );
  },

  async signOut() {
    await apiClient.post<unknown>('/auth/logout', {});
  },

  async simulate(role) {
    return toSession(
      await apiClient.post<unknown>('/auth/simulate', { role_id: role })
    );
  },
};
