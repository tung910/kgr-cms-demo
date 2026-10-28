import { useEffect, useRef } from 'react';
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

  // Guards against a double-click (or two near-simultaneous Enter/click
  // events) firing `form.submit()` twice before `onConfirm`'s mutation ever
  // sets `pending`. antd's OK button only disables once `confirmLoading`
  // (= `pending`) is true, and that only flips *after* this component's
  // `onFinish` → the caller's `mutate()` call — i.e. after async field
  // validation has already run once. A second click landing in that window
  // would call `form.submit()` again, validate independently, and reach
  // `onConfirm` a second time with a *different* idempotency key, defeating
  // the whole point of idempotency protection on this endpoint. This ref is
  // set synchronously at the first click, before `form.submit()` runs, and
  // is the only thing a second click's `onOk` handler ever sees.
  const submitting = useRef(false);
  const wasPending = useRef(false);

  // Reset the guard once the mutation settles (success or error) so a
  // legitimate retry after a transient failure isn't permanently blocked.
  useEffect(() => {
    if (wasPending.current && !pending) submitting.current = false;
    wasPending.current = pending;
  }, [pending]);

  // Reset the guard whenever the dialog closes (cancel, or a successful
  // submit that closed it from the parent), so the next open — a genuinely
  // new attempt — starts clean.
  useEffect(() => {
    if (!open) submitting.current = false;
  }, [open]);

  return (
    <Modal
      title={
        isEnable
          ? t('autoAttach.dialog.enableTitle')
          : t('autoAttach.dialog.disableTitle')
      }
      open={open}
      onCancel={onCancel}
      onOk={() => {
        if (submitting.current) return;
        submitting.current = true;
        form.submit();
      }}
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
        onFinishFailed={() => {
          // Validation failed, so `onConfirm`/`mutate()` never ran and
          // `pending` never flips — release the guard here instead so the
          // user can fix the field and submit again.
          submitting.current = false;
        }}
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
