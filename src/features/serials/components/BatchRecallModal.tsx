import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { recallSerialBatch } from '../api/serialApi';
import { serialQueries } from '../queries/serialQueries';
import type { SerialBatch } from '../schemas/serialSchemas';

export interface BatchRecallModalProps {
  batch: SerialBatch | undefined;
  onClose: () => void;
}

export function BatchRecallModal({ batch, onClose }: BatchRecallModalProps) {
  const { t } = useTranslation('serials');
  const [form] = Form.useForm<{ reason: string }>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: { reason: string }) =>
      recallSerialBatch({ batchId: batch!.id, reason: values.reason }),
    onSuccess: () => {
      void message.success(t('recallModal.success'));
      void queryClient.invalidateQueries({ queryKey: serialQueries.all });
      form.resetFields();
      onClose();
    },
    onError: () => void message.error(t('recallModal.error')),
  });

  return (
    <Modal
      title={t('recallModal.title', { batchId: batch?.id })}
      open={Boolean(batch)}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okButtonProps={{ danger: true }}
      okText={t('recallModal.confirm')}
      cancelText={t('editModal.cancel')}
    >
      <Alert
        type="warning"
        className="mb-4"
        message={t('recallModal.warning', { total: batch?.total ?? 0 })}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="reason"
          label={t('recallModal.reason')}
          rules={[{ required: true, whitespace: true }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
