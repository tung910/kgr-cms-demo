import { Form, Input, Modal, Radio, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { DECLINE_REASONS, type DeclineReason } from '../constants/alertEnums';
import type { ContactResultInput } from '../schemas/alertSchemas';

type Outcome = 'agreed' | 'declined' | 'unreachable';
interface Values {
  outcome: Outcome;
  reasonCode?: DeclineReason;
  note?: string;
}
export function ContactResultDialog({
  open,
  canCreateTicket,
  pending,
  onCancel,
  onSubmit,
  onAgreed,
}: {
  open: boolean;
  canCreateTicket: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: ContactResultInput) => void;
  onAgreed: () => void;
}) {
  const { t } = useTranslation('alerts');
  const [form] = Form.useForm<Values>();
  const outcome = Form.useWatch('outcome', form);
  const reason = Form.useWatch('reasonCode', form);
  return (
    <Modal
      title={t('contact.title')}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={
        outcome === 'agreed' ? t('contact.continue') : t('contact.submit')
      }
      cancelText={t('actions.cancel')}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => {
          if (values.outcome === 'agreed') {
            onAgreed();
            return;
          }
          onSubmit(
            values.outcome === 'unreachable'
              ? {
                  outcome: 'unreachable',
                  ...(values.note?.trim() && { note: values.note.trim() }),
                }
              : {
                  outcome: 'declined',
                  reasonCode: values.reasonCode!,
                  ...(values.note?.trim() && { note: values.note.trim() }),
                }
          );
        }}
      >
        <Form.Item
          name="outcome"
          rules={[{ required: true, message: t('errors.validation') }]}
        >
          <Radio.Group className="flex flex-col gap-3">
            {canCreateTicket ? (
              <Radio value="agreed">{t('contact.agreed')}</Radio>
            ) : null}
            <Radio value="declined">{t('contact.declined')}</Radio>
            <Radio value="unreachable">{t('contact.unreachable')}</Radio>
          </Radio.Group>
        </Form.Item>
        {outcome === 'declined' ? (
          <Form.Item
            name="reasonCode"
            label={t('contact.reason')}
            rules={[{ required: true, message: t('errors.validation') }]}
          >
            <Select
              options={DECLINE_REASONS.map((item) => ({
                value: item.value,
                label: t(item.labelKey),
              }))}
            />
          </Form.Item>
        ) : null}
        {outcome === 'declined' || outcome === 'unreachable' ? (
          <Form.Item
            name="note"
            label={t('contact.note')}
            rules={
              reason === 'other'
                ? [
                    {
                      required: true,
                      whitespace: true,
                      message: t('errors.validation'),
                    },
                  ]
                : undefined
            }
          >
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
