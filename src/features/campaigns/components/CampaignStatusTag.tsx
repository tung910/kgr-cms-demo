import { useTranslation } from 'react-i18next';

import { toneColors } from '@/shared/components/portal/tone';

import {
  CAMPAIGN_STATUS_LABEL_KEYS,
  CAMPAIGN_STATUS_TONES,
  type CampaignStatus,
} from '../constants/campaignStatus';

export interface CampaignStatusTagProps {
  status: CampaignStatus;
}

export function CampaignStatusTag({ status }: CampaignStatusTagProps) {
  const { t } = useTranslation('campaigns');
  const tone = CAMPAIGN_STATUS_TONES[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{
        backgroundColor: toneColors[tone].bg,
        color: toneColors[tone].fg,
      }}
    >
      {t(CAMPAIGN_STATUS_LABEL_KEYS[status])}
    </span>
  );
}
