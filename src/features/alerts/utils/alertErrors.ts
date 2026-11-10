import type { TFunction } from 'i18next';
import { getApiErrorCode } from '@/core/api/error';

export function alertErrorMessage(
  error: unknown,
  t: TFunction<'alerts'>
): string {
  const code = getApiErrorCode(error);
  return t(code ? `errors.${code}` : 'errors.generic', {
    defaultValue: t('errors.generic'),
  });
}
