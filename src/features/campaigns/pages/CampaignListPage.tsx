import { useState } from 'react';
import { useDeferredValue } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import { PageState } from '@/shared/components/PageState';

import { CampaignFilters } from '../components/CampaignFilters';
import { CampaignTable } from '../components/CampaignTable';
import { CampaignWizard } from '../components/CampaignWizard';
import { campaignQueries } from '../queries/campaignQueries';
import type { CampaignListFilters } from '../schemas/campaignSchemas';

export interface CampaignListPageProps {
  filters: CampaignListFilters;
}

export function CampaignListPage({ filters }: CampaignListPageProps) {
  const { t } = useTranslation('campaigns');
  const navigate = useNavigate({ from: '/campaigns/' });
  const [wizardOpen, setWizardOpen] = useState(false);
  const deferredFilters = useDeferredValue(filters);
  const { data } = useSuspenseQuery(campaignQueries.list(deferredFilters));
  const { data: counts } = useSuspenseQuery(
    campaignQueries.counts(deferredFilters)
  );

  const updateFilters = (changes: Partial<CampaignListFilters>) =>
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('listPage.title')}
        description={t('listPage.description')}
        actions={
          <PermissionGuard capability="campaign.write">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setWizardOpen(true)}
            >
              {t('listPage.create')}
            </Button>
          </PermissionGuard>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('listPage.stats.total')}
          icon={<NotificationOutlined />}
          tone="info"
          value={counts.total}
        />
        <PortalStatCard
          label={t('listPage.stats.running')}
          icon={<PlayCircleOutlined />}
          tone="primary"
          value={counts.running}
        />
        <PortalStatCard
          label={t('listPage.stats.pendingApproval')}
          icon={<ClockCircleOutlined />}
          tone="warning"
          value={counts.pendingApproval}
        />
        <PortalStatCard
          label={t('listPage.stats.draft')}
          icon={<CheckCircleOutlined />}
          tone="water"
          value={counts.draft}
        />
      </div>
      <PortalCard padded={false}>
        <CampaignFilters
          filters={filters}
          onChange={updateFilters}
          onReset={() =>
            void navigate({
              search: { search: '', page: 1, pageSize: 10 },
            })
          }
        />
        {data.items.length === 0 ? (
          <PageState kind="empty" description={t('listPage.empty')} />
        ) : (
          <CampaignTable
            data={data}
            filters={deferredFilters}
            loading={deferredFilters !== filters}
            onOpen={(id) =>
              void navigate({
                to: '/campaigns/$campaignId',
                params: { campaignId: id },
              })
            }
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
          />
        )}
      </PortalCard>
      <CampaignWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
