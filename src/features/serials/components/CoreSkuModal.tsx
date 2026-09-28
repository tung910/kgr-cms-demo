import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';

import { updateCoreLifecycleConfig } from '../api/coreLifecycleApi';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import {
  CORE_KINDS,
  type CoreLifecycleAuditChange,
  type CoreSku,
} from '../schemas/coreLifecycleSchemas';

export interface CoreSkuModalProps {
  cores: CoreSku[];
  core: CoreSku | null;
  onClose: () => void;
}

const AUDITED_FIELDS = [
  'kind',
  'lifespanMonths',
  'lifespanLiters',
  'warningLevel1Percent',
  'warningLevel2Percent',
  'guideVideoUrl',
  'saleRegions',
  'tdsFactors',
] as const;

function buildChanges(before: CoreSku, after: CoreSku) {
  return AUDITED_FIELDS.flatMap<CoreLifecycleAuditChange>((field) => {
    const beforeValue = JSON.stringify(before[field] ?? '');
    const afterValue = JSON.stringify(after[field] ?? '');
    return beforeValue === afterValue
      ? []
      : [{ field: `${field} (${after.sku})`, beforeValue, afterValue }];
  });
}

export function CoreSkuModal({ cores, core, onClose }: CoreSkuModalProps) {
  const { t } = useTranslation('serials');
  const { session } = useAuth();
  const [form] = Form.useForm<CoreSku>();
  const queryClient = useQueryClient();
  const canWrite =
    !!session && hasCapability(session.role, 'core_config.write');
  const canTune = !!session && hasCapability(session.role, 'core_config.tune');

  useEffect(() => {
    if (core) form.setFieldsValue(core);
  }, [core, form]);

  const mutation = useMutation({
    mutationFn: (values: CoreSku) => {
      const next: CoreSku = { ...core!, ...values, sku: core!.sku };
      if (!next.guideVideoUrl) delete next.guideVideoUrl;
      return updateCoreLifecycleConfig({
        cores: cores.map((item) => (item.sku === next.sku ? next : item)),
        changes: buildChanges(core!, next),
      });
    },
    onSuccess: () => {
      void message.success(t('editModal.success'));
      void queryClient.invalidateQueries({
        queryKey: coreLifecycleQueries.all,
      });
      onClose();
    },
    onError: () => void message.error(t('editModal.error')),
  });

  return (
    <Modal
      title={t('coreLifecycle.editCore', { sku: core?.sku })}
      open={!!core}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('editModal.save')}
      cancelText={t('editModal.cancel')}
      width={720}
      destroyOnHidden
    >
      <Form<CoreSku>
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
      >
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Form.Item name="name" label={t('coreLifecycle.coreName')}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="kind" label={t('coreLifecycle.kind')}>
            <Select
              disabled={!canWrite}
              options={CORE_KINDS.map((kind) => ({
                value: kind,
                label: t(`coreLifecycle.kinds.${kind}`),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="lifespanMonths"
            label={t('coreLifecycle.lifespanMonths')}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={1}
              precision={0}
              className="w-full"
              disabled={!canWrite}
            />
          </Form.Item>
          <Form.Item
            name="lifespanLiters"
            label={t('coreLifecycle.lifespanLiters')}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} className="w-full" disabled={!canWrite} />
          </Form.Item>
          <Form.Item
            name="warningLevel1Percent"
            label={t('coreLifecycle.warningLevel1')}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={0}
              max={100}
              className="w-full"
              disabled={!canTune}
            />
          </Form.Item>
          <Form.Item
            name="warningLevel2Percent"
            label={t('coreLifecycle.warningLevel2')}
            dependencies={['warningLevel1Percent']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, value: number) =>
                  value > getFieldValue('warningLevel1Percent')
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(t('coreLifecycle.level2AboveLevel1'))
                      ),
              }),
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              className="w-full"
              disabled={!canTune}
            />
          </Form.Item>
          <Form.Item
            name="guideVideoUrl"
            label={t('coreLifecycle.guideVideo')}
            rules={[{ type: 'url' }]}
          >
            <Input disabled={!canWrite} />
          </Form.Item>
          <Form.Item name="saleRegions" label={t('coreLifecycle.saleRegions')}>
            <Select
              mode="tags"
              disabled={!canWrite}
              placeholder={t('coreLifecycle.allRegions')}
            />
          </Form.Item>
        </div>
        <div className="mb-2 font-medium">{t('coreLifecycle.tdsFactors')}</div>
        <Form.List name="tdsFactors">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.key} className="flex items-start gap-2">
                  <Form.Item
                    name={[field.name, 'minPpm']}
                    rules={[{ required: true }]}
                    className="mb-0 flex-1"
                  >
                    <InputNumber
                      min={0}
                      addonBefore={t('coreLifecycle.fromPpm')}
                      className="w-full"
                      disabled={!canTune}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'maxPpm']}
                    className="mb-0 flex-1"
                  >
                    <InputNumber
                      min={1}
                      addonBefore={t('coreLifecycle.toPpm')}
                      className="w-full"
                      disabled={!canTune}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'factor']}
                    rules={[{ required: true }]}
                    className="mb-0 flex-1"
                  >
                    <InputNumber
                      min={0.1}
                      step={0.1}
                      addonBefore="×"
                      className="w-full"
                      disabled={!canTune}
                    />
                  </Form.Item>
                  {canTune && (
                    <Button
                      type="text"
                      aria-label={t('coreLifecycle.delete')}
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  )}
                </div>
              ))}
              {canTune && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({ minPpm: 0, factor: 1 })}
                >
                  {t('coreLifecycle.addTdsFactor')}
                </Button>
              )}
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
