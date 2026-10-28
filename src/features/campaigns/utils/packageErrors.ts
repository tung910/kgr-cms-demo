import type { TFunction } from 'i18next';

import { getApiErrorCode } from '@/core/api/error';

// Business error codes about the promoted package -> localized message key.
const PACKAGE_ERROR_KEYS: Record<string, string> = {
  package_unavailable: 'package.error.unavailable',
  invalid_package_offer: 'package.error.invalidOffer',
};

// Message for a failed save/submit/transition: the package-specific text when
// the backend rejected the package or its offer, otherwise the error's own
// message, otherwise `fallback`.
export function packageErrorMessage(
  error: Error,
  t: TFunction,
  fallback: string
): string {
  const code = getApiErrorCode(error);
  const key = code ? PACKAGE_ERROR_KEYS[code] : undefined;
  return key ? t(key) : error.message || fallback;
}
