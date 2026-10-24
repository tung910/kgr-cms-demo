import { ArrowLeftOutlined } from '@ant-design/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { PageState } from '@/shared/components/PageState';
import { PortalPageHeader } from '@/shared/components/portal';

import { CampaignWizard } from '../components/CampaignWizard';
import { campaignQueries } from '../queries/campaignQueries';

export interface CampaignWizardPageProps {
  draftId?: string;
}

function EditWizard({ draftId }: { draftId: string }) {
  const { t } = useTranslation('campaigns');
  const { data: campaign } = useSuspenseQuery(campaignQueries.detail(draftId));
  // Only a draft can be edited; a rejected campaign is already back in draft.
  if (campaign.status !== 'draft')
    return <PageState kind="empty" description={t('wizard.notEditable')} />;
  return <CampaignWizard key={campaign.id} campaign={campaign} />;
}

export function CampaignWizardPage({ draftId }: CampaignWizardPageProps) {
  const { t } = useTranslation('campaigns');
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={draftId ? t('wizard.editTitle') : t('wizard.createTitle')}
        description={t('wizard.description')}
        actions={
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
        }
      />
      {draftId ? <EditWizard draftId={draftId} /> : <CampaignWizard />}
    </div>
  );
}
