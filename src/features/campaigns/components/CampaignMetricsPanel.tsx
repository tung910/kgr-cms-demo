import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalStatCard } from '@/shared/components/portal';

import { campaignQueries } from '../queries/campaignQueries';
import type { Campaign } from '../schemas/campaignSchemas';
import { exportCampaignMetricsToCsv } from '../utils/exportCampaignMetricsToCsv';

export interface CampaignMetricsPanelProps {
  campaign: Campaign;
}

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const percent = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';

export function CampaignMetricsPanel({ campaign }: CampaignMetricsPanelProps) {
  const { t } = useTranslation('campaigns');
  const { data, isLoading } = useQuery(campaignQueries.metrics(campaign.id));

  if (isLoading || !data) {
    return (
      <div className="flex justify-center p-6">
        <Spin />
      </div>
    );
  }

  const conversions = data.conversionsBooking + data.conversionsQr;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('metrics.sent')}
          tone="info"
          value={data.sent}
        />
        <PortalStatCard
          label={t('metrics.delivered')}
          tone="primary"
          value={data.delivered}
          detail={t('metrics.deliveredRate', {
            rate: percent(data.delivered, data.sent),
          })}
        />
        <PortalStatCard
          label={t('metrics.opened')}
          tone="primary"
          value={data.opened}
          detail={t('metrics.openRate', {
            rate: percent(data.opened, data.delivered),
          })}
        />
        <PortalStatCard
          label={t('metrics.clicked')}
          tone="warning"
          value={data.clicked}
          detail={t('metrics.clickRate', {
            rate: percent(data.clicked, data.opened),
          })}
        />
        <PortalStatCard
          label={t('metrics.conversionsBooking')}
          tone="water"
          value={data.conversionsBooking}
        />
        <PortalStatCard
          label={t('metrics.conversionsQr')}
          tone="water"
          value={data.conversionsQr}
        />
        <PortalStatCard
          label={t('metrics.conversionRate')}
          tone="primary"
          value={percent(conversions, data.clicked)}
        />
        <PortalStatCard
          label={t('metrics.revenue')}
          tone="primary"
          value={currency.format(data.revenue)}
        />
      </div>
      <PermissionGuard capability="campaign.export">
        <Button
          icon={<DownloadOutlined />}
          onClick={() =>
            exportCampaignMetricsToCsv(
              campaign,
              data,
              {
                campaign: t('table.columns.campaign'),
                sent: t('metrics.sent'),
                delivered: t('metrics.delivered'),
                opened: t('metrics.opened'),
                clicked: t('metrics.clicked'),
                conversionsBooking: t('metrics.conversionsBooking'),
                conversionsQr: t('metrics.conversionsQr'),
                revenue: t('metrics.revenue'),
              },
              t('metrics.fileLabel')
            )
          }
        >
          {t('metrics.export')}
        </Button>
      </PermissionGuard>
    </div>
  );
}
