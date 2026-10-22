import { useState } from 'react';
import { ExperimentOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { testSendCampaign } from '../api/campaignApi';
import type { Campaign } from '../schemas/campaignSchemas';

export interface TestSendDialogProps {
  campaign: Campaign;
}

// "Gửi thử cho nhóm test" (spec 7.5). Validates input in the UI; the mock
// records an audit entry but dispatches nothing (demo backend has no sender).
export function TestSendDialog({ campaign }: TestSendDialogProps) {
  const { t } = useTranslation('campaigns');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ recipients: string }>();

  const mutation = useMutation({
    mutationFn: () => testSendCampaign(campaign.id),
    onSuccess: () => {
      void message.success(t('testSend.success'));
      setOpen(false);
      form.resetFields();
    },
    onError: () => void message.error(t('testSend.error')),
  });

  return (
    <>
      <Button icon={<ExperimentOutlined />} onClick={() => setOpen(true)}>
        {t('testSend.button')}
      </Button>
      <Modal
        open={open}
        title={t('testSend.title')}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okText={t('testSend.send')}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={() => mutation.mutate()}
        >
          <Form.Item
            name="recipients"
            label={t('testSend.recipientsLabel')}
            tooltip={t('testSend.recipientsHint')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea rows={3} placeholder="0901234567, 0987654321" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
