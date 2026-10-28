import { Alert, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export interface ServicePackageStatusDialogProps {
  open: boolean;
  title: string;
  /** What publishing/retiring means for the storefront and the app. */
  warning: string;
  okText: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

interface FormValues {
  reason: string;
}

// A publish/archive is a state change on a configurable catalogue item, so it
// requires a reason that feeds the immutable audit log.
export function ServicePackageStatusDialog({
  open,
  title,
  warning,
  okText,
  pending,
  onCancel,
  onConfirm,
}: ServicePackageStatusDialogProps) {
  const { t } = useTranslation('servicePackages');
  const [form] = Form.useForm<FormValues>();

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={okText}
      cancelText={t('statusDialog.cancel')}
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
          label={t('statusDialog.reasonLabel')}
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
