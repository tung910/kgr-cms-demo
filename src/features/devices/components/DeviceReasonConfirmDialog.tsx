import { Alert, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export interface DeviceReasonConfirmDialogProps {
  open: boolean;
  title: string;
  /** Impact on the customer, shown above the reason field. */
  warning: string;
  okText: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

interface FormValues {
  reason: string;
}

// §3.4b: every destructive ownership change needs a reason for the audit log.
export function DeviceReasonConfirmDialog({
  open,
  title,
  warning,
  okText,
  pending,
  onCancel,
  onConfirm,
}: DeviceReasonConfirmDialogProps) {
  const { t } = useTranslation('devices');
  const [form] = Form.useForm<FormValues>();

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={okText}
      cancelText={t('ownership.cancel')}
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <Alert type="warning" showIcon message={warning} className="mb-4" />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => onConfirm(values.reason.trim())}
      >
        <Form.Item
          name="reason"
          label={t('ownership.reason')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('validation.required'),
            },
          ]}
        >
          <Input.TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
