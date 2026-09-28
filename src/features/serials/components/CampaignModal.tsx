import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker, Form, Input, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { updateCoreLifecycleConfig } from '../api/coreLifecycleApi';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import type {
  CoreLifecycleCampaign,
  CoreSku,
} from '../schemas/coreLifecycleSchemas';

export interface CampaignModalProps {
  cores: CoreSku[];
  campaigns: CoreLifecycleCampaign[];
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  name: string;
  sku?: string;
  pushContent: string;
  ctaLabel: string;
  deeplink: string;
  runWindow: [dayjs.Dayjs, dayjs.Dayjs];
}

export function CampaignModal({
  cores,
  campaigns,
  open,
  onClose,
}: CampaignModalProps) {
  const { t } = useTranslation('serials');
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const campaign: CoreLifecycleCampaign = {
        id: `campaign-${Date.now()}`,
        name: values.name,
        ...(values.sku && { sku: values.sku }),
        pushContent: values.pushContent,
        ctaLabel: values.ctaLabel,
        deeplink: values.deeplink,
        startsAt: values.runWindow[0].toISOString(),
        endsAt: values.runWindow[1].toISOString(),
      };

      return updateCoreLifecycleConfig({
        campaigns: [...campaigns, campaign],
        changes: [
          {
            field: `campaign (${values.name})`,
            beforeValue: '—',
            afterValue: t('coreLifecycle.campaignCreated'),
          },
        ],
      });
    },
    onSuccess: () => {
      void message.success(t('editModal.success'));
      void queryClient.invalidateQueries({
        queryKey: coreLifecycleQueries.all,
      });
      form.resetFields();
      onClose();
    },
    onError: () => {
      void message.error(t('editModal.error'));
    },
  });

  return (
    <Modal
      title={t('coreLifecycle.addCampaign')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('editModal.save')}
      cancelText={t('editModal.cancel')}
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label={t('coreLifecycle.campaignName')}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="sku" label={t('coreLifecycle.sku')}>
          <Select
            allowClear
            placeholder={t('coreLifecycle.allSkus')}
            options={cores.map((core) => ({
              value: core.sku,
              label: `${core.sku} · ${core.name}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="pushContent"
          label={t('coreLifecycle.pushContent')}
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          name="ctaLabel"
          label={t('coreLifecycle.ctaLabel')}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="deeplink"
          label={t('coreLifecycle.deeplink')}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="runWindow"
          label={t('coreLifecycle.runWindow')}
          rules={[{ required: true }]}
        >
          <DatePicker.RangePicker showTime className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
