import { useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Space, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';

import { transitionCampaign } from '../api/campaignApi';
import { campaignQueries } from '../queries/campaignQueries';
import type { Campaign, CampaignTransition } from '../schemas/campaignSchemas';

export interface CampaignActionsProps {
  campaign: Campaign;
}

// Lifecycle buttons for the campaign detail page (spec 7.5). Each transition
// asks for a reason that is written to the immutable audit log. Submitting for
// approval happens in the wizard, where the approver is chosen.
export function CampaignActions({ campaign }: CampaignActionsProps) {
  const { t } = useTranslation('campaigns');
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reasonFor, setReasonFor] = useState<CampaignTransition | null>(null);
  const [form] = Form.useForm<{ reason: string }>();

  const can = (capability: Parameters<typeof hasCapability>[1]) =>
    !!session && hasCapability(session.role, capability);
  // Creator ≠ approver (spec 7.5): the author never sees approve/reject.
  const isAuthor = session?.user.id === campaign.createdBy;

  const mutation = useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: CampaignTransition;
      reason: string;
    }) => transitionCampaign(campaign.id, { action, reason }),
    onSuccess: (_data, variables) => {
      void message.success(t(`transitions.done.${variables.action}`));
      void queryClient.invalidateQueries({ queryKey: campaignQueries.all });
      setReasonFor(null);
      form.resetFields();
    },
    onError: (error: Error) =>
      void message.error(error.message || t('errors.transitionFailed')),
  });

  const actions: CampaignTransition[] = [];
  if (campaign.status === 'pending_approval') {
    if (can('campaign.approve') && !isAuthor) actions.push('approve', 'reject');
  } else if (campaign.status === 'approved') {
    if (can('campaign.send')) actions.push('run');
  } else if (campaign.status === 'running') {
    if (can('campaign.send')) actions.push('pause', 'stop');
  } else if (campaign.status === 'paused') {
    if (can('campaign.send')) actions.push('resume', 'stop');
  }
  const canEdit = campaign.status === 'draft' && can('campaign.write');

  if (actions.length === 0 && !canEdit) return null;

  const danger = reasonFor === 'reject' || reasonFor === 'stop';

  return (
    <>
      <Space wrap>
        {canEdit ? (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() =>
              void navigate({
                to: '/campaigns/new',
                search: { draftId: campaign.id },
              })
            }
          >
            {t('detail.editAndSubmit')}
          </Button>
        ) : null}
        {actions.map((action) => (
          <Button
            key={action}
            type={
              action === 'approve' || action === 'run' ? 'primary' : 'default'
            }
            danger={action === 'reject' || action === 'stop'}
            onClick={() => setReasonFor(action)}
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
        okButtonProps={{ danger }}
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
