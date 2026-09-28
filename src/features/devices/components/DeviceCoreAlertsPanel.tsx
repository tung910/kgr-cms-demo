import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Tag, message } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { PortalCard, PortalProgress } from '@/shared/components/portal';

import { createServiceTicketFromCoreAlert } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type { CoreAlert } from '../schemas/deviceDetailSchemas';

interface FormValues {
  reason: string;
}

// M03.1 — surfaced only when a core has crossed its M04.1 threshold; the
// CTA reuses the existing service-ticket flow instead of a parallel one.
export function DeviceCoreAlertsPanel({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [pending, setPending] = useState<CoreAlert | null>(null);

  const alerts = useQuery(deviceQueries.coreAlerts(device.id));

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!pending) throw new Error(t('coreAlerts.error'));
      return createServiceTicketFromCoreAlert(
        device.id,
        pending.position,
        values.reason
      );
    },
    onSuccess: () => {
      void message.success(t('coreAlerts.ticketSuccess'));
      void queryClient.invalidateQueries({
        queryKey: deviceQueries.coreAlerts(device.id).queryKey,
      });
      setPending(null);
      form.resetFields();
      void navigate({ to: '/warranties' });
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('coreAlerts.error'));
    },
  });

  if (!alerts.data || alerts.data.length === 0) return null;

  return (
    <PortalCard title={t('coreAlerts.title')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {alerts.data.map((alert) => (
          <div
            key={alert.position}
            className="rounded-lg border border-[#F0C9C5] bg-[#FFF0EE] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-[#020204]">
                {t('coreAlerts.position', {
                  position: alert.position,
                  name: alert.coreName,
                })}
              </p>
              <Tag color={alert.status === 'assigned' ? 'blue' : 'red'}>
                {t('coreAlerts.status.' + alert.status)}
              </Tag>
            </div>
            <p className="mb-1 mt-2 text-xs text-[#636466]">
              {t('coreAlerts.code')}: <b>{alert.errorCode}</b> ·{' '}
              {t('coreAlerts.sku')}: <b>{alert.replacementSku}</b>
            </p>
            <PortalProgress value={alert.usedPercent} max={100} tone="danger" />
            <p className="mb-0 mt-1 text-xs text-[#636466]">
              {t('coreAlerts.usedPercent', {
                used: alert.usedPercent,
                threshold: alert.thresholdPercent,
              })}
            </p>
            {alert.status === 'open' ? (
              <Button
                className="mt-2"
                size="small"
                type="primary"
                onClick={() => setPending(alert)}
              >
                {t('coreAlerts.createAppointment')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <Modal
        title={
          pending
            ? t('coreAlerts.modalTitle', { position: pending.position })
            : ''
        }
        open={pending !== null}
        onCancel={() => setPending(null)}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okText={t('coreAlerts.confirm')}
        cancelText={t('coreAlerts.cancel')}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => mutation.mutate(values)}
        >
          <Form.Item
            name="reason"
            label={t('coreAlerts.reason')}
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
    </PortalCard>
  );
}
