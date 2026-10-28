import { Alert, DatePicker, Form, Input, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';

export interface ServicePackageAutoAttachDialogProps {
  open: boolean;
  /** 'enable' asks for an effective date; 'disable' only asks for a reason. */
  mode: 'enable' | 'disable';
  pending: boolean;
  onCancel: () => void;
  onConfirm: (values: { from: string | null; reason: string }) => void;
}

interface FormValues {
  reason: string;
  from?: Dayjs;
}

// Toggling auto-attach-on-stock-intake (spec §4.1) is a state change on a
// configurable catalogue item, so — like publish/archive — it requires a
// reason that feeds the immutable audit log. Enabling additionally requires
// an effective date that is not before today (no retroactive attach, §4.3).
export function ServicePackageAutoAttachDialog({
  open,
  mode,
  pending,
  onCancel,
  onConfirm,
}: ServicePackageAutoAttachDialogProps) {
  const { t } = useTranslation('servicePackages');
  const [form] = Form.useForm<FormValues>();
  const isEnable = mode === 'enable';

  return (
    <Modal
      title={
        isEnable
          ? t('autoAttach.dialog.enableTitle')
          : t('autoAttach.dialog.disableTitle')
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={
        isEnable
          ? t('autoAttach.dialog.confirmEnable')
          : t('autoAttach.dialog.confirmDisable')
      }
      cancelText={t('statusDialog.cancel')}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        message={
          isEnable
            ? t('autoAttach.dialog.enableWarning')
            : t('autoAttach.dialog.disableWarning')
        }
        className="mb-4"
      />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ from: dayjs() }}
        onFinish={(values) =>
          onConfirm({
            from: isEnable ? (values.from?.format('YYYY-MM-DD') ?? null) : null,
            reason: values.reason.trim(),
          })
        }
      >
        {isEnable ? (
          <Form.Item
            name="from"
            label={t('autoAttach.dialog.dateLabel')}
            rules={[
              { required: true, message: t('validation.required') },
              {
                validator: (_, value: Dayjs | undefined) =>
                  !value || !value.isBefore(dayjs(), 'day')
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(t('autoAttach.dialog.pastDate'))
                      ),
              },
            ]}
          >
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              disabledDate={(current) =>
                !!current && current.isBefore(dayjs(), 'day')
              }
            />
          </Form.Item>
        ) : null}
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
