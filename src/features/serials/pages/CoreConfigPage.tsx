import { useQuery } from '@tanstack/react-query';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from '@tanstack/react-router';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import { PageState } from '@/shared/components/PageState';
import { PortalPageHeader } from '@/shared/components/portal';

import {
  CoreLifecyclePanel,
  type CoreLifecycleFilters,
} from '../components/CoreLifecyclePanel';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import { serialQueries } from '../queries/serialQueries';

export interface CoreConfigPageProps {
  filters: CoreLifecycleFilters;
}

export function CoreConfigPage({ filters }: CoreConfigPageProps) {
  const { t } = useTranslation('serials');
  const navigate = useNavigate({ from: '/serials/core-config' });
  const config = useQuery(coreLifecycleQueries.detail());
  const batches = useQuery(serialQueries.batches());

  return (
    <div className="space-y-6">
      <Link
        to="/serials"
        search={{ search: '', page: 1, pageSize: 20 }}
        className="inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeftOutlined /> {t('coreConfigPage.backToSerials')}
      </Link>
      <PortalPageHeader title={t('coreConfigPage.title')} />
      {config.isPending || batches.isPending ? (
        <Skeleton active />
      ) : config.data && batches.data ? (
        <CoreLifecyclePanel
          config={config.data}
          batches={batches.data}
          filters={filters}
          onFiltersChange={(changes) =>
            void navigate({
              search: (previous) => ({ ...previous, ...changes }),
            })
          }
        />
      ) : (
        <PageState kind="error" description={t('coreConfigPage.loadError')} />
      )}
    </div>
  );
}
