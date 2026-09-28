import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PageState } from '@/shared/components/PageState';
import { PortalCard, PortalPageHeader } from '@/shared/components/portal';

import { BackupPanel } from '../components/BackupPanel';
import { ConfigForm } from '../components/ConfigForm';
import { systemQueries } from '../queries/systemQueries';

export function SystemConfigPage() {
  const { t } = useTranslation('system');
  const { session } = useAuth();
  const { data: config } = useSuspenseQuery(systemQueries.config());
  const canBackup = !!session && hasCapability(session.role, 'backup.read');
  const backups = useQuery({ ...systemQueries.backups(), enabled: canBackup });
  const canEdit = !!session && hasCapability(session.role, 'config.update');

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('config.title')}
        description={t('config.description')}
      />
      <PortalCard>
        <Tabs
          items={[
            {
              key: 'config',
              label: t('config.tabs.config'),
              // Remount when the saved config changes so the form resets.
              children: (
                <ConfigForm
                  key={config.updatedAt}
                  config={config}
                  canEdit={canEdit}
                />
              ),
            },
            ...(canBackup
              ? [
                  {
                    key: 'backup',
                    label: t('config.tabs.backup'),
                    children: backups.isError ? (
                      <PageState
                        kind="error"
                        onRetry={() => void backups.refetch()}
                      />
                    ) : (
                      <BackupPanel backups={backups.data ?? []} />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </PortalCard>
    </div>
  );
}
