import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import {
  hasMenuAccess,
  type PortalMenuKey,
} from '@/core/permissions/capabilities';
import { PageState } from '@/shared/components/PageState';
import { PortalPageHeader } from '@/shared/components/portal';

interface PortalSectionPageProps {
  titleKey: string;
  menu?: PortalMenuKey;
}

export function PortalSectionPage({ titleKey, menu }: PortalSectionPageProps) {
  const { session } = useAuth();
  const { t } = useTranslation('portal');

  if (menu && (!session || !hasMenuAccess(session.role, menu))) {
    return <PageState kind="forbidden" />;
  }

  return <PortalPageHeader title={t(titleKey)} />;
}
