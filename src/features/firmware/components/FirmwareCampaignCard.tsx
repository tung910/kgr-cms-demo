import { Button, Progress, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { PortalCard } from '@/shared/components/portal';
import { formatDateTime } from '@/shared/lib/format';

import type {
  CampaignStatus,
  FirmwareAction,
  FirmwareCampaign,
} from '../mocks/firmwareMockData';

const statusColors: Record<CampaignStatus, string> = {
  running: 'processing',
  paused: 'warning',
  completed: 'success',
  cancelled: 'default',
};

export interface FirmwareCampaignCardProps {
  campaign: FirmwareCampaign;
  onAction: (id: string, action: FirmwareAction) => void;
}

export function FirmwareCampaignCard({
  campaign,
  onAction,
}: FirmwareCampaignCardProps) {
  const { t } = useTranslation('firmware');
  const isOverThreshold =
    campaign.errorRatePercent >= campaign.errorThresholdPercent;
  const isActive =
    campaign.status === 'running' || campaign.status === 'paused';

  return (
    <PortalCard
      title={campaign.name}
      actions={
        <Tag color={statusColors[campaign.status]}>
          {t(`status.${campaign.status}`)}
        </Tag>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#636466]">
          <span className="rounded bg-[#F3F4F4] px-1.5 py-0.5 font-mono">
            {t(`track.${campaign.track}`)} · {campaign.targetVersion}
          </span>
          <span>
            {t('campaign.deviceCount', { count: campaign.deviceCount })}
          </span>
          <span>
            {t('campaign.startedAt', {
              date: formatDateTime(campaign.startedAt),
            })}
          </span>
        </div>
        <Progress
          percent={campaign.progressPercent}
          status={campaign.status === 'cancelled' ? 'exception' : undefined}
        />
        <div
          className={
            isOverThreshold
              ? 'text-sm font-medium text-[#D9131F]'
              : 'text-sm text-[#636466]'
          }
        >
          {t('campaign.errorRate', {
            rate: campaign.errorRatePercent,
            threshold: campaign.errorThresholdPercent,
          })}
        </div>
        {isActive ? (
          <div className="flex flex-wrap gap-2">
            {campaign.status === 'running' ? (
              <Button onClick={() => onAction(campaign.id, 'pause')}>
                {t('actions.pause')}
              </Button>
            ) : (
              <Button onClick={() => onAction(campaign.id, 'resume')}>
                {t('actions.resume')}
              </Button>
            )}
            <Button danger onClick={() => onAction(campaign.id, 'cancel')}>
              {t('actions.cancel')}
            </Button>
          </div>
        ) : null}
      </div>
    </PortalCard>
  );
}
