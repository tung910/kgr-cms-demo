import { ExperimentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { campaignQueries } from '../../queries/campaignQueries';
import type {
  CampaignDraftInput,
  CoreOption,
} from '../../schemas/campaignSchemas';
import { CampaignSummary } from '../CampaignSummary';
import { splitRecipients, type WizardValues } from './wizardValues';

export interface StepReviewProps {
  draft: CampaignDraftInput;
  cores: readonly CoreOption[];
  testSending: boolean;
  onTestSend: (recipients: string[]) => void;
}

// B6 — summary, who approves it, and an optional test send.
export function StepReview({
  draft,
  cores,
  testSending,
  onTestSend,
}: StepReviewProps) {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const recipients = Form.useWatch('testRecipients', form) ?? '';
  const approvers = useQuery(campaignQueries.approvers());

  return (
    <div className="grid gap-5">
      <section className="min-w-0 overflow-x-auto rounded-xl border border-[#E7E8E9] bg-[#F7F8F8] p-4">
        <CampaignSummary data={draft} cores={cores} />
      </section>
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item
          name="approverId"
          label={t('fields.approver')}
          tooltip={t('fields.approverHint')}
          className="mb-0"
          rules={[{ required: true, message: t('errors.approverRequired') }]}
        >
          <Select
            className="w-full"
            loading={approvers.isFetching}
            placeholder={t('fields.approverPlaceholder')}
            options={approvers.data?.map((approver) => ({
              value: approver.id,
              label: approver.name,
            }))}
            notFoundContent={t('fields.noApprovers')}
          />
        </Form.Item>
      </section>
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item
          name="testRecipients"
          label={t('fields.testRecipients')}
          extra={t('fields.testRecipientsHint')}
        >
          <Input.TextArea
            rows={2}
            placeholder="0901234567, tester@kangaroo.vn"
          />
        </Form.Item>
        <Button
          icon={<ExperimentOutlined />}
          loading={testSending}
          disabled={splitRecipients(recipients).length === 0}
          onClick={() => onTestSend(splitRecipients(recipients))}
        >
          {t('wizard.testSend')}
        </Button>
      </section>
      <Alert type="info" showIcon title={t('wizard.approvalNote')} />
    </div>
  );
}
