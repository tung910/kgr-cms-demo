import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Steps,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorCode } from '@/core/api/error';
import { createTicketFromAlert } from '../api/alertApi';
import {
  APPOINTMENT_SLOTS,
  SERVICE_TYPES,
  type AppointmentSlot,
  type ServiceType,
} from '../constants/alertEnums';
import { alertQueries } from '../queries/alertQueries';
import type { AlertDetail, CreateTicketInput } from '../schemas/alertSchemas';
import { alertErrorMessage } from '../utils/alertErrors';
import { TechnicianPicker } from './TechnicianPicker';

interface Values {
  serviceType: ServiceType;
  corePositions: string[];
  issueDescription?: string;
  contactName: string;
  contactPhone: string;
  address: string;
  appointmentDate?: Dayjs;
  appointmentSlot?: AppointmentSlot;
  technicianNote?: string;
  mergedAlertIds: string[];
  technicianId?: string;
}
export function TicketWizardModal({
  open,
  alert,
  onClose,
}: {
  open: boolean;
  alert: AlertDetail;
  onClose: () => void;
}) {
  const { t } = useTranslation('alerts');
  const [form] = Form.useForm<Values>();
  const [step, setStep] = useState(0);
  const queryClient = useQueryClient();
  const serviceType = Form.useWatch('serviceType', form);
  const appointmentDate = Form.useWatch('appointmentDate', form);
  const appointmentSlot = Form.useWatch('appointmentSlot', form);
  const technicianId = Form.useWatch('technicianId', form);
  const initialValues: Values = {
    serviceType: alert.suggestedServiceType,
    corePositions: alert.device.cores
      .filter((core) => core.overThreshold)
      .map((core) => core.position),
    issueDescription: alert.name,
    contactName: alert.customer?.name ?? '',
    contactPhone: alert.customer?.phone ?? '',
    address: alert.customer?.address ?? '',
    mergedAlertIds: alert.siblingAlerts.map((item) => item.id),
  };
  const mutation = useMutation({
    mutationFn: (input: CreateTicketInput) =>
      createTicketFromAlert(alert.id, input),
    onSuccess: async (updated) => {
      void message.success(
        t('ticket.createSuccess', { code: updated.ticket?.code })
      );
      onClose();
      await queryClient.invalidateQueries({ queryKey: alertQueries.all });
    },
    onError: async (error) => {
      const code = getApiErrorCode(error);
      void message.error(alertErrorMessage(error, t));
      if (
        code === 'invalid_state' ||
        code === 'not_handler' ||
        code === 'not_found'
      )
        onClose();
      await queryClient.invalidateQueries({ queryKey: alertQueries.all });
    },
  });
  const submit = async (assignNow: boolean) => {
    const values = await form.validateFields();
    mutation.mutate({
      serviceType: values.serviceType,
      corePositions: values.corePositions ?? [],
      ...(values.issueDescription?.trim() && {
        issueDescription: values.issueDescription.trim(),
      }),
      contactName: values.contactName.trim(),
      contactPhone: values.contactPhone.trim(),
      address: values.address.trim(),
      appointmentDate: values.appointmentDate!.format('YYYY-MM-DD'),
      appointmentSlot: values.appointmentSlot!,
      ...(values.technicianNote?.trim() && {
        technicianNote: values.technicianNote.trim(),
      }),
      mergedAlertIds: values.mergedAlertIds ?? [],
      ...(assignNow && values.technicianId
        ? { technicianId: values.technicianId }
        : {}),
    });
  };
  return (
    <Modal
      width={760}
      title={t('ticket.createTitle')}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (visible) setStep(0);
      }}
      footer={
        step === 0 ? (
          <Button
            type="primary"
            onClick={() => void form.validateFields().then(() => setStep(1))}
          >
            {t('ticket.next')}
          </Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep(0)}>{t('ticket.back')}</Button>
            <Button
              loading={mutation.isPending}
              onClick={() => void submit(false)}
            >
              {t('ticket.saveLater')}
            </Button>
            <Button
              type="primary"
              disabled={!technicianId}
              loading={mutation.isPending}
              onClick={() => void submit(true)}
            >
              {t('ticket.createAndAssign')}
            </Button>
          </div>
        )
      }
    >
      <Steps
        current={step}
        items={[
          { title: t('ticket.information') },
          { title: t('ticket.dispatch') },
        ]}
        className="mb-6"
      />
      <Form
        form={form}
        layout="vertical"
        preserve
        initialValues={initialValues}
      >
        {step === 0 ? (
          <>
            <Alert
              type="info"
              className="mb-4"
              message={t('ticket.source', {
                code: alert.id,
                device: alert.deviceId,
                model: alert.modelName,
                warranty: t(
                  `detail.warrantyStatus.${alert.device.warrantyStatus}`
                ),
              })}
            />
            {alert.otherOpenTicketCount > 0 ? (
              <Alert
                type="warning"
                className="mb-4"
                message={t('ticket.otherOpen', {
                  count: alert.otherOpenTicketCount,
                })}
              />
            ) : null}
            <Form.Item
              name="serviceType"
              label={t('ticket.serviceType')}
              rules={[{ required: true }]}
            >
              <Select
                options={SERVICE_TYPES.map((item) => ({
                  value: item.value,
                  label: t(item.labelKey),
                }))}
              />
            </Form.Item>
            {serviceType === 'core_replacement' ? (
              <Form.Item
                name="corePositions"
                label={t('ticket.cores')}
                rules={[
                  {
                    required: true,
                    type: 'array',
                    min: 1,
                    message: t('errors.validation'),
                  },
                ]}
              >
                <Checkbox.Group
                  options={alert.device.cores.map((core) => ({
                    value: core.position,
                    label: `${core.position} · ${core.coreName}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="issueDescription"
                label={t('ticket.issue')}
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={500} />
              </Form.Item>
            )}
            <Form.Item
              name="contactName"
              label={t('ticket.contactName')}
              rules={[{ required: true, whitespace: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="contactPhone"
              label={t('ticket.contactPhone')}
              rules={[
                { required: true },
                { pattern: /^\d{9,11}$/, message: t('errors.validation') },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="address"
              label={t('detail.address')}
              rules={[{ required: true, whitespace: true }]}
            >
              <Input />
            </Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="appointmentDate"
                label={t('ticket.date')}
                rules={[{ required: true }]}
              >
                <DatePicker
                  className="w-full"
                  disabledDate={(date) =>
                    date.startOf('day').isBefore(dayjs().startOf('day'))
                  }
                />
              </Form.Item>
              <Form.Item
                name="appointmentSlot"
                label={t('ticket.slot')}
                rules={[{ required: true }]}
              >
                <Select
                  options={APPOINTMENT_SLOTS.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Form.Item>
            </div>
            <Form.Item name="technicianNote" label={t('ticket.note')}>
              <Input.TextArea maxLength={500} showCount />
            </Form.Item>
            {alert.siblingAlerts.length ? (
              <Form.Item name="mergedAlertIds" label={t('ticket.merge')}>
                <Checkbox.Group
                  className="flex flex-col gap-2"
                  options={alert.siblingAlerts.map((item) => ({
                    value: item.id,
                    label: `${item.name} · ${item.errorCode}`,
                  }))}
                />
              </Form.Item>
            ) : null}
          </>
        ) : appointmentDate && appointmentSlot && serviceType ? (
          <Form.Item name="technicianId">
            <TechnicianPicker
              params={{
                alertId: alert.id,
                appointmentDate: appointmentDate.format('YYYY-MM-DD'),
                appointmentSlot,
                serviceType,
              }}
              value={technicianId}
              onChange={(value) => form.setFieldValue('technicianId', value)}
            />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
