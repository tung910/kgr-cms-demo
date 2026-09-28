import { useMutation } from '@tanstack/react-query';
import { Form, Input, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { getApiErrorCode } from '@/core/api/error';

import { changePassword } from './passwordApi';

export interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordModal({
  open,
  onClose,
}: ChangePasswordModalProps) {
  const { t } = useTranslation('common');
  const [form] = Form.useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      void message.success(t('auth.changePassword.success'));
      form.resetFields();
      onClose();
    },
    onError: (error) => {
      const code = getApiErrorCode(error);
      void message.error(
        code === 'invalid_credentials' || code === 'weak_password'
          ? t(`auth.changePassword.errors.${code}`)
          : t('auth.changePassword.errors.generic')
      );
    },
  });

  return (
    <Modal
      title={t('auth.changePassword.title')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('auth.changePassword.submit')}
      cancelText={t('auth.cancel')}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          mutation.mutate({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          })
        }
      >
        <Form.Item
          name="currentPassword"
          label={t('auth.changePassword.current')}
          rules={[{ required: true }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('auth.changePassword.new')}
          rules={[{ required: true }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t('auth.changePassword.confirm')}
          dependencies={['newPassword']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator: (_, value: string) =>
                !value || getFieldValue('newPassword') === value
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(t('auth.changePassword.mismatch'))
                    ),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
