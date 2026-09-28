import type { TFunction } from 'i18next';

import { ApiError, getApiErrorCode } from '@/core/api/error';

// Maps a backend business code to a translated message. The `weak_password`
// message carries the minimum password length.
export function systemErrorMessage(t: TFunction, error: unknown): string {
  const code = getApiErrorCode(error);
  const min = error instanceof ApiError ? error.message : '';

  return t(`errors.${code ?? 'generic'}`, {
    ns: 'system',
    min,
    defaultValue: t('errors.generic', { ns: 'system' }),
  });
}
