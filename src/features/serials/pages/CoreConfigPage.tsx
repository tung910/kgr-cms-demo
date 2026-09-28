import { useQuery } from '@tanstack/react-query';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from '@tanstack/react-router';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import { PageState } from '@/shared/components/PageState';
import { PortalPageHeader } from '@/shared/components/portal';

import { CoreLifecyclePanel } from '../components/CoreLifecyclePanel';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';

export interface CoreConfigPageProps {
  modelId?: string;
}

export function CoreConfigPage({ modelId }: CoreConfigPageProps) {
  const { t } = useTranslation('serials');
  const config = useQuery(coreLifecycleQueries.detail());

  return (
    <div className="space-y-6">
      <Link
        to="/serials"
        search={{ search: '', page: 1, pageSize: 20 }}
        className="inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeftOutlined /> {t('coreConfigPage.backToSerials')}
      </Link>
      <PortalPageHeader
        title={t('coreConfigPage.title')}
        description={t('coreConfigPage.description')}
      />
      {config.isPending ? (
        <Skeleton active />
      ) : config.data ? (
        <CoreLifecyclePanel
          config={config.data}
          {...(modelId && { modelId })}
        />
      ) : (
        <PageState kind="error" description={t('editModal.error')} />
      )}
    </div>
  );
}
