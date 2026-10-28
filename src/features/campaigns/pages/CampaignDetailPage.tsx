import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { PortalCard, PortalPageHeader } from '@/shared/components/portal';

import { CampaignActions } from '../components/CampaignActions';
import { CampaignAuditPanel } from '../components/CampaignAuditPanel';
import { CampaignMetricsPanel } from '../components/CampaignMetricsPanel';
import { CampaignPhonePreview } from '../components/CampaignPhonePreview';
import { CampaignStatusTag } from '../components/CampaignStatusTag';
import { CampaignSummary } from '../components/CampaignSummary';
import { PromotedPackageWarning } from '../components/PromotedPackageWarning';
import { offerText } from '../utils/offerText';
import { packageCardOf } from '../utils/packagePricing';
import { campaignQueries } from '../queries/campaignQueries';

export interface CampaignDetailPageProps {
  campaignId: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PortalCard>
      <h2 className="mb-4 mt-0 text-base font-semibold text-[#020204]">
        {title}
      </h2>
      {children}
    </PortalCard>
  );
}

export function CampaignDetailPage({ campaignId }: CampaignDetailPageProps) {
  const { t } = useTranslation('campaigns');
  const navigate = useNavigate();
  const { data: campaign } = useSuspenseQuery(
    campaignQueries.detail(campaignId)
  );

  // Numbers only exist once it has been (or is about to be) sent.
  const showMetrics =
    campaign.status === 'running' ||
    campaign.status === 'paused' ||
    campaign.status === 'ended';

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={campaign.name}
        description={`${campaign.id} · ${t(`kind.${campaign.kind}`)} · ${t(
          `displayType.${campaign.displayType}`
        )}`}
        actions={
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() =>
                void navigate({
                  to: '/campaigns',
                  search: { search: '', page: 1, pageSize: 10 },
                })
              }
            >
              {t('detail.back')}
            </Button>
            <CampaignActions campaign={campaign} />
          </Space>
        }
      />

      <PromotedPackageWarning campaign={campaign} />
      {campaign.status === 'draft' && campaign.rejectedReason ? (
        <Alert
          type="warning"
          showIcon
          title={t('detail.rejectedTitle')}
          description={campaign.rejectedReason}
        />
      ) : null}
      {campaign.status === 'pending_approval' && campaign.approverName ? (
        <Alert
          type="info"
          showIcon
          title={t('detail.waitingApprover', { name: campaign.approverName })}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PortalCard
          title={t('detail.sections.overview')}
          actions={<CampaignStatusTag status={campaign.status} />}
        >
          <CampaignSummary
            data={campaign}
            promotedPackage={campaign.promotedPackage}
          />
        </PortalCard>
        <PortalCard>
          <CampaignPhonePreview
            displayType={campaign.displayType}
            title={campaign.title}
            content={campaign.content}
            buttonLabels={campaign.buttons.map((button) => button.label)}
            offerLabel={offerText(campaign.offer, t)}
            packageCard={packageCardOf(
              campaign.promotedPackage,
              campaign.offer,
              t
            )}
          />
        </PortalCard>
      </div>

      {showMetrics ? (
        <Section title={t('detail.sections.metrics')}>
          <CampaignMetricsPanel campaign={campaign} />
        </Section>
      ) : null}

      <Section title={t('detail.sections.history')}>
        <CampaignAuditPanel campaign={campaign} />
      </Section>
    </div>
  );
}
