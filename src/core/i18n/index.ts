import 'dayjs/locale/vi';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import commonEn from './locales/en.json';
import commonVi from './locales/vi.json';
import alertsEn from '@/features/alerts/locales/en.json';
import alertsVi from '@/features/alerts/locales/vi.json';
import analyticsEn from '@/features/analytics/locales/en.json';
import analyticsVi from '@/features/analytics/locales/vi.json';
import serialsEn from '@/features/serials/locales/en.json';
import serialsVi from '@/features/serials/locales/vi.json';
import customersEn from '@/features/customers/locales/en.json';
import customersVi from '@/features/customers/locales/vi.json';
import campaignsEn from '@/features/campaigns/locales/en.json';
import campaignsVi from '@/features/campaigns/locales/vi.json';
import dashboardEn from '@/features/dashboard/locales/en.json';
import dashboardVi from '@/features/dashboard/locales/vi.json';
import devicesEn from '@/features/devices/locales/en.json';
import devicesVi from '@/features/devices/locales/vi.json';
import firmwareEn from '@/features/firmware/locales/en.json';
import firmwareVi from '@/features/firmware/locales/vi.json';
import mapsEn from '@/features/maps/locales/en.json';
import mapsVi from '@/features/maps/locales/vi.json';
import systemEn from '@/features/system/locales/en.json';
import systemVi from '@/features/system/locales/vi.json';
import portalEn from '@/features/portal/locales/en.json';
import portalVi from '@/features/portal/locales/vi.json';

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        dashboard: dashboardEn,
        devices: devicesEn,
        alerts: alertsEn,
        analytics: analyticsEn,
        serials: serialsEn,
        customers: customersEn,
        // Campaigns ships Vietnamese only for now: English falls back to it
        // until en.json is translated (shallow merge — flatten before adding).
        campaigns: { ...campaignsVi, ...campaignsEn },
        firmware: firmwareEn,
        maps: mapsEn,
        portal: portalEn,
        system: systemEn,
      },
      vi: {
        common: commonVi,
        dashboard: dashboardVi,
        devices: devicesVi,
        alerts: alertsVi,
        analytics: analyticsVi,
        serials: serialsVi,
        customers: customersVi,
        campaigns: campaignsVi,
        firmware: firmwareVi,
        maps: mapsVi,
        portal: portalVi,
        system: systemVi,
      },
    },
    ns: [
      'common',
      'dashboard',
      'devices',
      'alerts',
      'analytics',
      'serials',
      'customers',
      'campaigns',
      'firmware',
      'maps',
      'portal',
      'system',
    ],
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kgr-cms-lang',
    },
  });

export default i18n;
