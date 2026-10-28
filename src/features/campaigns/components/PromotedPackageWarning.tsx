import { WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { toneColors } from '@/shared/components/portal/tone';

import type { CampaignStatus } from '../constants/campaignStatus';
import type { Campaign } from '../schemas/campaignSchemas';

// Statuses that still need the package to approve, run or resume (spec 4.5).
// Drafts can be re-pointed and ended campaigns no longer need it.
const WARNING_STATUSES: readonly CampaignStatus[] = [
  'pending_approval',
  'approved',
  'running',
  'paused',
];

export interface PromotedPackageWarningProps {
  campaign: Campaign;
}

// Flags a live campaign whose promoted package stopped being grantable
// (archived or no longer fully configured), so it would fail approval/run.
export function PromotedPackageWarning({
  campaign,
}: PromotedPackageWarningProps) {
  const { t } = useTranslation('campaigns');
  const pkg = campaign.promotedPackage;
  if (!pkg || pkg.grantable || !WARNING_STATUSES.includes(campaign.status))
    return null;

  return (
    <div
      role="alert"
      className="flex min-w-0 items-start gap-1.5 break-words text-xs"
      style={{ color: toneColors.warning.fg }}
    >
      <WarningOutlined className="mt-0.5 shrink-0" />
      <span className="min-w-0">
        {t('package.warning', { code: pkg.code })}
      </span>
    </div>
  );
}
