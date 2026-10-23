import { Alert, Timeline } from 'antd';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@/shared/lib/format';

import type { Campaign } from '../schemas/campaignSchemas';

export interface CampaignAuditPanelProps {
  campaign: Campaign;
}

// Lifecycle history from the campaign's own fields. Every state-changing action
// also writes an immutable entry to the system audit log under the "Chiến dịch"
// module (actor, timestamp, before/after, reason), viewable on the Audit Log
// screen — this panel surfaces the key milestones inline.
export function CampaignAuditPanel({ campaign }: CampaignAuditPanelProps) {
  const { t } = useTranslation('campaigns');

  const items = [
    {
      color: 'blue',
      children: (
        <div>
          <div className="font-medium">{t('history.created')}</div>
          <div className="text-xs text-[#636466]">
            {campaign.createdByName} · {formatDateTime(campaign.createdAt)}
          </div>
        </div>
      ),
    },
  ];

  if (campaign.approverName) {
    items.push({
      color: 'gray',
      children: (
        <div>
          <div className="font-medium">{t('history.submitted')}</div>
          <div className="text-xs text-[#636466]">
            {t('history.approverIs', { name: campaign.approverName })}
          </div>
        </div>
      ),
    });
  }

  if (campaign.approvedAt && campaign.approvedByName) {
    items.push({
      color: 'green',
      children: (
        <div>
          <div className="font-medium">{t('history.approved')}</div>
          <div className="text-xs text-[#636466]">
            {campaign.approvedByName} · {formatDateTime(campaign.approvedAt)}
          </div>
        </div>
      ),
    });
  }

  if (campaign.status === 'draft' && campaign.rejectedReason) {
    items.push({
      color: 'red',
      children: (
        <div>
          <div className="font-medium">{t('history.rejected')}</div>
          <div className="text-xs text-[#636466]">
            {t('transitions.reasonLabel')}: {campaign.rejectedReason}
          </div>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <Timeline items={items} />
      <Alert type="info" showIcon title={t('history.auditNote')} />
    </div>
  );
}
