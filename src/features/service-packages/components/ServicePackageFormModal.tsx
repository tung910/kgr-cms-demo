import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  BILLING_TYPES,
  SERVICE_PACKAGE_GROUPS,
} from '../constants/servicePackage';
import type {
  BillingType,
  ServicePackageDraftInput,
  ServicePackageGroup,
} from '../schemas/servicePackageSchemas';

export interface ServicePackageFormModalProps {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: ServicePackageDraftInput) => void;
}

interface FormValues {
  code: string;
  name: string;
  group: ServicePackageGroup;
  billingType: BillingType;
  price: number;
  billingPeriodMonths?: number;
  termMonths?: number;
  eligibleModelCount: number;
  description?: string;
}

// Create a new add-on package. One form library (Ant Form). The billing
// cadence only applies to recurring/subscription packages.
export function ServicePackageFormModal({
  open,
  pending,
  onCancel,
  onSubmit,
}: ServicePackageFormModalProps) {
  const { t } = useTranslation('servicePackages');
  const [form] = Form.useForm<FormValues>();
  const billingType = Form.useWatch('billingType', form);
  const needsPeriod =
    billingType === 'recurring' || billingType === 'subscription';

  const groupOptions = SERVICE_PACKAGE_GROUPS.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));
  const billingOptions = BILLING_TYPES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));

  const handleFinish = (values: FormValues) => {
    onSubmit({
      code: values.code.trim().toLocaleUpperCase(),
      name: values.name.trim(),
      group: values.group,
      billingType: values.billingType,
      price: values.price,
      billingPeriodMonths: needsPeriod
        ? (values.billingPeriodMonths ?? null)
        : null,
      termMonths: values.termMonths ?? null,
      eligibleModelCount: values.eligibleModelCount,
      description: values.description?.trim()
        ? values.description.trim()
        : null,
    });
  };

  return (
    <Modal
      title={t('form.title')}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={t('form.submit')}
      cancelText={t('form.cancel')}
      destroyOnHidden
      width={560}
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ price: 0, eligibleModelCount: 0 }}
        onFinish={handleFinish}
      >
        <Form.Item
          name="code"
          label={t('form.codeLabel')}
          extra={t('form.codeHint')}
          rules={[
            {
              required: true,
              pattern: /^[A-Za-z0-9][A-Za-z0-9-]*$/,
              message: t('form.validation.codeRequired'),
            },
          ]}
        >
          <Input placeholder={t('form.codePlaceholder')} />
        </Form.Item>

        <Form.Item
          name="name"
          label={t('form.nameLabel')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('form.validation.nameRequired'),
            },
          ]}
        >
          <Input placeholder={t('form.namePlaceholder')} />
        </Form.Item>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="group"
            label={t('form.groupLabel')}
            rules={[
              {
                required: true,
                message: t('form.validation.groupRequired'),
              },
            ]}
          >
            <Select options={groupOptions} />
          </Form.Item>

          <Form.Item
            name="billingType"
            label={t('form.billingTypeLabel')}
            rules={[
              {
                required: true,
                message: t('form.validation.billingTypeRequired'),
              },
            ]}
          >
            <Select options={billingOptions} />
          </Form.Item>

          <Form.Item
            name="price"
            label={t('form.priceLabel')}
            extra={t('form.priceHint')}
            rules={[
              {
                required: true,
                message: t('form.validation.priceRequired'),
              },
            ]}
          >
            <InputNumber<number>
              min={0}
              step={10000}
              className="w-full"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
              }
              parser={(value) => Number((value ?? '').replace(/\./g, ''))}
            />
          </Form.Item>

          {needsPeriod ? (
            <Form.Item
              name="billingPeriodMonths"
              label={t('form.billingPeriodLabel')}
              rules={[
                {
                  required: true,
                  message: t('form.validation.billingPeriodRequired'),
                },
              ]}
            >
              <InputNumber
                min={1}
                className="w-full"
                placeholder={t('form.billingPeriodPlaceholder')}
              />
            </Form.Item>
          ) : null}

          <Form.Item name="termMonths" label={t('form.termLabel')}>
            <InputNumber
              min={1}
              className="w-full"
              placeholder={t('form.termPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="eligibleModelCount"
            label={t('form.eligibleModelsLabel')}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item name="description" label={t('form.descriptionLabel')}>
          <Input.TextArea
            rows={2}
            maxLength={200}
            showCount
            placeholder={t('form.descriptionPlaceholder')}
          />
        </Form.Item>

        <p className="text-xs text-brand-gray">{t('form.hint')}</p>
      </Form>
    </Modal>
  );
}
