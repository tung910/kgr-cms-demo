import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

import { restoreDevice } from '../api/deviceApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';

export interface DeviceLifecycleActionsProps {
  device: Device;
}

interface FormValues {
  reason: string;
}

// §3.4c: lock/unlock lives in DeviceRemoteActions' header "Actions" menu —
// this component only handles the record-management restore action.
export function DeviceLifecycleActions({
  device,
}: DeviceLifecycleActionsProps) {
  const { t } = useTranslation('devices');
  const [restoring, setRestoring] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      restoreDevice(device, { reason: values.reason }),
    onSuccess: () => {
      void message.success(t('lifecycleActions.restoreSuccess'));
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
      setRestoring(false);
      form.resetFields();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('lifecycleActions.error'));
    },
  });

  // M03.1: restorable when decommissioned — the server is the source of truth
  // for the 7-day window.
  const canRestore = device.lifecycleState === 'decommissioned';

  return (
    <>
      <PermissionGuard capability="device.lifecycle">
        {canRestore ? (
          <Button size="small" onClick={() => setRestoring(true)}>
            {t('lifecycleActions.restore')}
          </Button>
        ) : null}
      </PermissionGuard>

      <Modal
        title={t('lifecycleActions.confirmTitle.restore')}
        open={restoring}
        onCancel={() => {
          setRestoring(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okText={t('lifecycleActions.confirm')}
        cancelText={t('lifecycleActions.cancel')}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => mutation.mutate(values)}
        >
          <Form.Item
            name="reason"
            label={t('lifecycleActions.reason')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('validation.required'),
              },
            ]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
