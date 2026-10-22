import { useState } from 'react';
import { Button, Form, Input, Modal, Space, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';

import { transitionCampaign } from '../api/campaignApi';
import { campaignQueries } from '../queries/campaignQueries';
import type { Campaign, CampaignTransition } from '../schemas/campaignSchemas';

export interface CampaignApprovalActionsProps {
  campaign: Campaign;
}

// Actions that require a mandatory reason (spec 7.5 audit).
const REASON_ACTIONS = new Set<CampaignTransition>([
  'approve',
  'reject',
  'stop',
]);

export function CampaignApprovalActions({
  campaign,
}: CampaignApprovalActionsProps) {
  const { t } = useTranslation('campaigns');
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [reasonFor, setReasonFor] = useState<CampaignTransition | null>(null);
  const [form] = Form.useForm<{ reason: string }>();

  const canWrite = session
    ? hasCapability(session.role, 'campaign.write')
    : false;
  const canApprove = session
    ? hasCapability(session.role, 'campaign.approve')
    : false;
  // Spec 7.5: running/stopping a campaign is "cho chạy/dừng" (campaign.send),
  // separate from approving it (campaign.approve).
  const canSend = session
    ? hasCapability(session.role, 'campaign.send')
    : false;

  const mutation = useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: CampaignTransition;
      reason?: string;
    }) => transitionCampaign(campaign.id, action, reason),
    onSuccess: (_data, variables) => {
      void message.success(t(`transitions.done.${variables.action}`));
      void queryClient.invalidateQueries({ queryKey: campaignQueries.all });
      setReasonFor(null);
      form.resetFields();
    },
    onError: (error: Error) =>
      void message.error(error.message || t('errors.transitionFailed')),
  });

  const run = (action: CampaignTransition) => {
    if (REASON_ACTIONS.has(action)) {
      setReasonFor(action);
      return;
    }
    mutation.mutate({ action });
  };

  const actions: CampaignTransition[] = [];
  if (campaign.status === 'draft' || campaign.status === 'rejected') {
    if (canWrite) actions.push('submit');
  } else if (campaign.status === 'pending_approval') {
    if (canApprove) actions.push('approve', 'reject');
  } else if (campaign.status === 'approved') {
    if (canSend) actions.push('run');
  } else if (campaign.status === 'running') {
    if (canSend) actions.push('stop');
  }

  if (actions.length === 0) return null;

  return (
    <>
      <Space wrap>
        {actions.map((action) => (
          <Button
            key={action}
            type={
              action === 'approve' || action === 'submit' || action === 'run'
                ? 'primary'
                : 'default'
            }
            danger={action === 'reject' || action === 'stop'}
            loading={
              mutation.isPending && mutation.variables?.action === action
            }
            onClick={() => run(action)}
          >
            {t(`transitions.action.${action}`)}
          </Button>
        ))}
      </Space>
      <Modal
        open={reasonFor !== null}
        title={reasonFor ? t(`transitions.action.${reasonFor}`) : ''}
        onCancel={() => {
          setReasonFor(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okButtonProps={{
          danger: reasonFor === 'reject' || reasonFor === 'stop',
        }}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={({ reason }) =>
            reasonFor && mutation.mutate({ action: reasonFor, reason })
          }
        >
          <Form.Item
            name="reason"
            label={t('transitions.reasonLabel')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('transitions.reasonRequired'),
              },
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
