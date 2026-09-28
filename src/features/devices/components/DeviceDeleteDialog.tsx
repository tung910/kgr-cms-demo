import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Form, Input, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';

import { deleteDevice } from '../api/deviceApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';

export interface DeviceDeleteDialogProps {
  device: Device;
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  reason: string;
}

export function DeviceDeleteDialog({
  device,
  open,
  onClose,
}: DeviceDeleteDialogProps) {
  const { t } = useTranslation('devices');
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const blockingReasons: string[] = [
    ...(device.openTicketCount +
      device.openAppointmentCount +
      device.openAlertCount >
    0
      ? [t('deleteDialog.blocking.openTickets')]
      : []),
    ...(device.hasActiveOta ? [t('deleteDialog.blocking.activeOta')] : []),
    ...(device.hasActiveRentalContract
      ? [t('deleteDialog.blocking.activeRental')]
      : []),
  ];
  if (
    device.activatedAt ||
    device.lastOnlineAt ||
    device.latestTelemetry.length > 0 ||
    device.status !== 'offline'
  )
    blockingReasons.push(t('errors.previouslyActive'));
  const isBlocked = blockingReasons.length > 0;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      deleteDevice(device, { reason: values.reason }),
    onSuccess: () => {
      void message.success(t('deleteDialog.deleteSuccess'));
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
      onClose();
      void navigate({
        to: '/devices',
        search: { search: '', page: 1, pageSize: 10 },
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('deleteDialog.error'));
    },
  });

  return (
    <Modal
      title={t('deleteDialog.deleteTitle', { deviceId: device.id })}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okButtonProps={{ danger: true, disabled: isBlocked }}
      okText={t('deleteDialog.confirmDelete')}
      cancelText={t('deleteDialog.cancel')}
      destroyOnHidden
    >
      <div className="mb-4 space-y-1 text-sm text-[#636466]">
        <p className="m-0">
          {t('deleteDialog.serial')}: <b>{device.id}</b>
        </p>
        <p className="m-0">
          {t('deleteDialog.model')}: <b>{device.modelName}</b>
        </p>
        <p className="m-0">
          {t('deleteDialog.currentOwner')}:{' '}
          <b>
            {device.owner?.name ??
              device.owner?.id ??
              t('deleteDialog.noOwner')}
          </b>
        </p>
      </div>

      <p>
        {t('deleteDialog.impact', {
          members: device.sharedMembers.length,
          automations: device.automationCount,
          tickets: device.openTicketCount,
          appointments: device.openAppointmentCount,
          alerts: device.openAlertCount,
        })}
      </p>
      <p>{t('deleteDialog.effects')}</p>
      {isBlocked ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          title={t('deleteDialog.blockedTitle')}
          description={
            <ul className="m-0 list-disc pl-4">
              {blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          }
        />
      ) : null}

      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (!isBlocked) mutation.mutate(values);
        }}
      >
        <Form.Item
          name="reason"
          label={t('deleteDialog.reason')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('validation.required'),
            },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder={t('deleteDialog.reasonHint')}
            disabled={isBlocked}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
