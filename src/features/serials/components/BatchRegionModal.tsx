import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import type { DistributionRegion } from '@/shared/constants/distributionRegion';

import { declareBatchRegion } from '../api/serialApi';
import { serialQueries } from '../queries/serialQueries';
import type { SerialBatch } from '../schemas/serialSchemas';
import { regionSelectOptions } from './regionOptions';

interface RegionFormValues {
  region: DistributionRegion;
  reason: string;
}

export interface BatchRegionModalProps {
  batch: SerialBatch | undefined;
  onClose: () => void;
}

export function BatchRegionModal({ batch, onClose }: BatchRegionModalProps) {
  const { t } = useTranslation('serials');
  const [form] = Form.useForm<RegionFormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: RegionFormValues) =>
      declareBatchRegion({
        batchId: batch!.id,
        region: values.region,
        reason: values.reason.trim(),
      }),
    onSuccess: () => {
      void message.success(t('regionModal.success', { batchId: batch?.id }));
      // Also refreshes the core-config audit log (same `serials` prefix).
      void queryClient.invalidateQueries({ queryKey: serialQueries.all });
      onClose();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('editModal.error'));
    },
  });

  return (
    <Modal
      title={t('regionModal.title', { batchId: batch?.id })}
      open={Boolean(batch)}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('editModal.save')}
      cancelText={t('editModal.cancel')}
      destroyOnHidden
    >
      <Form<RegionFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="region"
          label={t('regionModal.region')}
          rules={[{ required: true, message: t('regionModal.regionRequired') }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('regionModal.regionPlaceholder')}
            options={regionSelectOptions(t)}
          />
        </Form.Item>
        <Form.Item
          name="reason"
          label={t('regionModal.reason')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('regionModal.reasonRequired'),
            },
          ]}
        >
          <Input placeholder={t('regionModal.reasonPlaceholder')} />
        </Form.Item>
      </Form>
      <Alert type="info" showIcon title={t('regionModal.nextStep')} />
    </Modal>
  );
}
