import { apiClient } from '@/core/api/apiClient';

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.post<unknown>('/auth/change-password', {
    current_password: input.currentPassword,
    new_password: input.newPassword,
  });
}
