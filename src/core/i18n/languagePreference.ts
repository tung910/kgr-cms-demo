import dayjs from 'dayjs';

import i18n, { type SupportedLanguage } from '@/core/i18n';

export function setLanguage(lng: SupportedLanguage) {
  void i18n.changeLanguage(lng);
  dayjs.locale(lng);
}
