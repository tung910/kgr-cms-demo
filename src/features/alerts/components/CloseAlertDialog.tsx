import { Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export function CloseAlertDialog({
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (result: string) => void;
}) {
  const { t } = useTranslation('alerts');
  const [form] = Form.useForm<{ result: string }>();
  return (
    <Modal
      title={t('actions.close')}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={t('actions.close')}
      cancelText={t('actions.cancel')}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => onConfirm(values.result.trim())}
      >
        <Form.Item
          name="result"
          label={t('detail.result')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('errors.validation'),
            },
          ]}
        >
          <Input.TextArea rows={4} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
