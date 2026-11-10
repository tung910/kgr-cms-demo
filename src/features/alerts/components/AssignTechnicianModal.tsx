import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorCode } from '@/core/api/error';
import { assignTechnician } from '../api/alertApi';
import { alertQueries } from '../queries/alertQueries';
import { APPOINTMENT_SLOTS } from '../constants/alertEnums';
import type { AlertDetail } from '../schemas/alertSchemas';
import { alertErrorMessage } from '../utils/alertErrors';
import { TechnicianPicker } from './TechnicianPicker';

export function AssignTechnicianModal({
  open,
  alert,
  mode,
  onClose,
}: {
  open: boolean;
  alert: AlertDetail;
  mode: 'assign' | 'reassign';
  onClose: () => void;
}) {
  const { t } = useTranslation('alerts');
  const [form] = Form.useForm<{ technicianId: string; reason?: string }>();
  const queryClient = useQueryClient();
  const technicianId = Form.useWatch('technicianId', form);
  const detail = alert.ticketDetail;
  const appointmentSlot = APPOINTMENT_SLOTS.find(
    (slot) => slot === detail?.appointmentSlot
  );
  const mutation = useMutation({
    mutationFn: (values: { technicianId: string; reason?: string }) =>
      assignTechnician(alert.ticket!.id, values),
    onSuccess: async () => {
      void message.success(t('technician.assignSuccess'));
      onClose();
      await queryClient.invalidateQueries({ queryKey: alertQueries.all });
    },
    onError: async (error) => {
      const code = getApiErrorCode(error);
      void message.error(alertErrorMessage(error, t));
      if (['invalid_state', 'not_handler', 'not_found'].includes(code ?? ''))
        onClose();
      await queryClient.invalidateQueries({ queryKey: alertQueries.all });
    },
  });
  return (
    <Modal
      title={t(mode === 'assign' ? 'technician.assign' : 'technician.reassign')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: !technicianId }}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) =>
          mutation.mutate({
            technicianId: values.technicianId,
            ...(values.reason?.trim() && { reason: values.reason.trim() }),
          })
        }
      >
        {!detail?.appointmentDate || !appointmentSlot ? (
          <Alert type="warning" message={t('technician.scheduleForbidden')} />
        ) : (
          <Form.Item name="technicianId" rules={[{ required: true }]}>
            <TechnicianPicker
              params={{
                alertId: alert.id,
                appointmentDate: detail.appointmentDate,
                appointmentSlot,
                serviceType: detail.serviceType,
              }}
              value={technicianId}
              onChange={(value) => form.setFieldValue('technicianId', value)}
            />
          </Form.Item>
        )}
        {mode === 'reassign' ? (
          <Form.Item
            name="reason"
            label={t('technician.reason')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('errors.validation'),
              },
            ]}
          >
            <Input.TextArea maxLength={500} showCount />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
