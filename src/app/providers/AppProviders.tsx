import '@/core/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/app/providers/queryClient';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { theme } from '@/theme';

const antdLocales = { en: enUS, vi: viVN } as const;

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const { i18n } = useTranslation();
  const clearSessionQueryData = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
  };

  return (
    <ConfigProvider
      theme={theme}
      locale={antdLocales[i18n.language.startsWith('vi') ? 'vi' : 'en']}
      componentSize="middle"
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider onSessionTransition={clearSessionQueryData}>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
