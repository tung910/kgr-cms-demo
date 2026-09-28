import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { updateCoreLifecycleConfig } from '../api/coreLifecycleApi';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import type {
  CoreModelLayout,
  CorePosition,
  CoreSku,
} from '../schemas/coreLifecycleSchemas';

export interface ModelLayoutModalProps {
  modelId: string;
  cores: CoreSku[];
  modelLayouts: CoreModelLayout[];
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  positions: Array<Omit<CorePosition, 'position'>>;
}

export function ModelLayoutModal({
  modelId,
  cores,
  modelLayouts,
  open,
  onClose,
}: ModelLayoutModalProps) {
  const { t } = useTranslation('serials');
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const current = modelLayouts.find((item) => item.modelId === modelId);
  // Only SKUs with a lifespan config exist in `cores`, so a core without one
  // can never be assigned to a position.
  const skuOptions = cores.map((core) => ({
    value: core.sku,
    label: `${core.sku} · ${core.name}`,
  }));

  useEffect(() => {
    if (open) form.setFieldsValue({ positions: current?.positions ?? [] });
  }, [open, current, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const positions = values.positions.map((item, index) => ({
        ...item,
        position: String(index + 1),
      }));
      return updateCoreLifecycleConfig({
        modelLayouts: [
          ...modelLayouts.filter((item) => item.modelId !== modelId),
          { modelId, positions },
        ],
        changes: [
          {
            field: `model_layout (${modelId})`,
            beforeValue: JSON.stringify(current?.positions ?? []),
            afterValue: JSON.stringify(positions),
          },
        ],
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
      title={t('coreLifecycle.editLayout')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('editModal.save')}
      cancelText={t('editModal.cancel')}
      width={820}
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.List name="positions">
          {(fields, { add, remove }) => (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.key}
                  className="grid grid-cols-1 gap-x-3 rounded-lg border border-[#E7E8E9] p-3 sm:grid-cols-[1fr_2fr_1fr_auto]"
                >
                  <Form.Item
                    name={[field.name, 'name']}
                    label={t('coreLifecycle.positionName', {
                      position: index + 1,
                    })}
                    rules={[{ required: true }]}
                    className="mb-0"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'compatibleSkus']}
                    label={t('coreLifecycle.compatibleSkus')}
                    rules={[{ required: true }]}
                    className="mb-0"
                  >
                    <Select mode="multiple" options={skuOptions} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'defaultSku']}
                    label={t('coreLifecycle.defaultSku')}
                    dependencies={[['positions', field.name, 'compatibleSkus']]}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator: (_, value: string) =>
                          (
                            (getFieldValue([
                              'positions',
                              field.name,
                              'compatibleSkus',
                            ]) as string[] | undefined) ?? []
                          ).includes(value)
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error(
                                  t('coreLifecycle.defaultNotCompatible')
                                )
                              ),
                      }),
                    ]}
                    className="mb-0"
                  >
                    <Select options={skuOptions} />
                  </Form.Item>
                  <Button
                    type="text"
                    className="self-end"
                    aria-label={t('coreLifecycle.delete')}
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ name: '', compatibleSkus: [] })}
              >
                {t('coreLifecycle.addPosition')}
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
