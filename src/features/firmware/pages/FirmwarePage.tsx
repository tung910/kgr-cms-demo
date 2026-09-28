import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PortalPageHeader, PortalStatCard } from '@/shared/components/portal';

import { FirmwareCampaignCard } from '../components/FirmwareCampaignCard';
import { firmwareMockData } from '../mocks/firmwareMockData';
import type { FirmwareAction } from '../mocks/firmwareMockData';

export function FirmwarePage() {
  const { t } = useTranslation('firmware');
  const [campaigns, setCampaigns] = useState(firmwareMockData);

  const handleCampaignAction = (id: string, action: FirmwareAction) => {
    setCampaigns((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (action === 'pause') return { ...item, status: 'paused' };
        if (action === 'resume') return { ...item, status: 'running' };
        return { ...item, status: 'cancelled' };
      })
    );
  };

  const runningCount = campaigns.filter(
    (campaign) => campaign.status === 'running'
  ).length;
  const pausedCount = campaigns.filter(
    (campaign) => campaign.status === 'paused'
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PortalStatCard label={t('stats.running')} value={runningCount} />
        <PortalStatCard label={t('stats.paused')} value={pausedCount} />
        <PortalStatCard label={t('stats.total')} value={campaigns.length} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {campaigns.map((campaign) => (
          <FirmwareCampaignCard
            key={campaign.id}
            campaign={campaign}
            onAction={handleCampaignAction}
          />
        ))}
      </div>
    </div>
  );
}
