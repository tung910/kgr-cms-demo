import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import {
  DELIVERY_OPTIONS,
  type ServiceTypeCode,
} from '../constants/servicePackageTypes';
import type { ServicePackage } from '../schemas/servicePackageSchemas';

export function ServicePackageTextList({
  name,
  label,
  required = true,
}: {
  name: string | string[];
  label: string;
  required?: boolean;
}) {
  const { t } = useTranslation('servicePackages');
  return (
    <Form.List
      name={name}
      rules={
        required
          ? [
              {
                validator: async (_, value: unknown) => {
                  if (!Array.isArray(value) || !value.length)
                    throw new Error(t('create.required'));
                },
              },
            ]
          : []
      }
    >
      {(fields, { add, remove }, { errors }) => (
        <div className="mb-5">
          <div className="mb-2 text-sm font-medium">
            {label}
            {required ? ' *' : ''}
          </div>
          {fields.map((field) => (
            <div key={field.key} className="flex items-start gap-2">
              <Form.Item
                name={field.name}
                className="min-w-0 flex-1"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('create.required'),
                  },
                ]}
              >
                <Input aria-label={label} />
              </Form.Item>
              <Button
                icon={<DeleteOutlined />}
                aria-label={t('create.remove', { label })}
                onClick={() => remove(field.name)}
              />
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')}>
            {t('create.add', { label })}
          </Button>
          <Form.ErrorList errors={errors} />
        </div>
      )}
    </Form.List>
  );
}

function MaterialList({ name }: { name: 'materials' | 'components' }) {
  const { t } = useTranslation('servicePackages');
  return (
    <Form.List
      name={['configuration', name]}
      rules={[
        {
          validator: async (_, value: unknown) => {
            if (!Array.isArray(value) || !value.length)
              throw new Error(t('create.required'));
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <div className="mb-5 space-y-2">
          <div className="text-sm font-medium">
            {t(`create.fields.${name}`)} *
          </div>
          {fields.map((field) => (
            <div key={field.key} className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 gap-x-3 sm:grid-cols-2">
                {(['code', 'name'] as const).map((key) => (
                  <Form.Item
                    key={key}
                    name={[field.name, key]}
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: t('create.required'),
                      },
                    ]}
                  >
                    <Input
                      aria-label={t(`create.fields.${key}`)}
                      placeholder={t(`create.fields.${key}`)}
                    />
                  </Form.Item>
                ))}
              </div>
              <Button
                icon={<DeleteOutlined />}
                aria-label={t('create.remove', {
                  label: t(`create.fields.${name}`),
                })}
                onClick={() => remove(field.name)}
              />
            </div>
          ))}
          <Button
            icon={<PlusOutlined />}
            onClick={() => add({ code: '', name: '' })}
          >
            {t('create.add', { label: t(`create.fields.${name}`) })}
          </Button>
          <Form.ErrorList errors={errors} />
        </div>
      )}
    </Form.List>
  );
}

export function ServicePackageConfigurationFields({
  type,
  packages,
  loading,
  error,
  onRetry,
}: {
  type: ServiceTypeCode;
  packages: ServicePackage[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation('servicePackages');
  const required = [
    { required: true, whitespace: true, message: t('create.required') },
  ];
  const text = (name: string) => (
    <Form.Item
      name={['configuration', name]}
      label={t(`create.fields.${name}`)}
      rules={required}
    >
      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
    </Form.Item>
  );
  const number = (name: string) => (
    <Form.Item
      name={['configuration', name]}
      label={t(`create.fields.${name}`)}
      rules={[
        {
          required: true,
          type: 'integer',
          min: 1,
          message: t('create.positiveInteger'),
        },
      ]}
    >
      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
    </Form.Item>
  );
  const list = (name: string) => (
    <ServicePackageTextList
      name={['configuration', name]}
      label={t(`create.fields.${name}`)}
    />
  );
  const delivery = (allowed: string[]) => (
    <Form.Item
      name={['configuration', 'delivery']}
      label={t('create.fields.delivery')}
      rules={[{ required: true, message: t('create.required') }]}
    >
      <Select
        options={DELIVERY_OPTIONS.filter((item) =>
          allowed.includes(item.value)
        ).map((item) => ({ value: item.value, label: t(item.labelKey) }))}
      />
    </Form.Item>
  );

  const booking = (
    <Space wrap>
      <Form.Item
        name={['configuration', 'appointment']}
        valuePropName="checked"
      >
        <Checkbox>{t('create.fields.appointment')}</Checkbox>
      </Form.Item>
      <Form.Item name={['configuration', 'address']} valuePropName="checked">
        <Checkbox>{t('create.fields.address')}</Checkbox>
      </Form.Item>
    </Space>
  );
  switch (type) {
    case 'LD-STD':
      return (
        <>
          {text('performer')}
          {booking}
        </>
      );
    case 'LD-PRO':
      return (
        <>
          {text('performer')}
          {booking}
          {text('survey')}
        </>
      );
    case 'TH-OLD':
      return (
        <>
          {text('performer')}
          {list('documents')}
        </>
      );
    case 'BH-EXT':
      return text('coverage');
    case 'BH-ADP':
      return (
        <>
          {text('provider')}
          {text('coverage')}
          {list('evidence')}
        </>
      );
    case 'BH-CMP':
      return <MaterialList name="components" />;
    case 'BT-FIL':
      return (
        <>
          {number('interval')}
          <MaterialList name="materials" />
          {delivery(['self', 'technician'])}
        </>
      );
    case 'BT-CLN':
      return (
        <>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {number('interval')}
            {number('visits')}
          </div>
          {list('checklist')}
        </>
      );
    case 'BT-COR':
      return (
        <>
          <MaterialList name="materials" />
          {delivery(['shipment', 'technician'])}
        </>
      );
    case 'CS-VIP':
      return (
        <>
          {text('policy')}
          {list('benefits')}
        </>
      );
    case 'CS-WQ':
      return (
        <>
          {number('interval')}
          {list('checks')}
          {text('report')}
        </>
      );
    case 'CS-APP':
      return text('content');
    case 'TG-SUB':
      return (
        <>
          {text('transfer')}
          {list('services')}
        </>
      );
    case 'TG-ALL':
      return (
        <>
          {error ? (
            <p role="alert">
              {t('create.packageError')}{' '}
              <Button onClick={onRetry}>{t('create.retry')}</Button>
            </p>
          ) : null}
          <Form.List
            name={['configuration', 'packages']}
            rules={[
              {
                validator: async (_, value: unknown) => {
                  if (!Array.isArray(value) || !value.length)
                    throw new Error(t('create.required'));
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.key} className="rounded-lg bg-slate-50 p-3">
                    <Form.Item
                      name={[field.name, 'id']}
                      label={t('create.fields.package')}
                      rules={[
                        { required: true, message: t('create.required') },
                      ]}
                    >
                      <Select
                        loading={loading}
                        disabled={error}
                        showSearch
                        optionFilterProp="label"
                        options={packages
                          .filter(
                            (item) =>
                              item.status === 'active' &&
                              item.group !== 'bundle'
                          )
                          .map((item) => ({
                            value: item.id,
                            label: `${item.code} — ${item.name}`,
                          }))}
                      />
                    </Form.Item>
                    <div className="grid gap-x-3 sm:grid-cols-2">
                      {(['quantity', 'months'] as const).map((key) => (
                        <Form.Item
                          key={key}
                          name={[field.name, key]}
                          label={t(`create.fields.${key}`)}
                          rules={[
                            {
                              required: true,
                              type: 'integer',
                              min: 1,
                              message: t('create.positiveInteger'),
                            },
                          ]}
                        >
                          <InputNumber
                            min={1}
                            precision={0}
                            className="w-full"
                          />
                        </Form.Item>
                      ))}
                    </div>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      {t('create.remove', {
                        label: t('create.fields.package'),
                      })}
                    </Button>
                  </div>
                ))}
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => add()}
                  disabled={error || loading}
                >
                  {t('create.add', { label: t('create.fields.package') })}
                </Button>
                <Form.ErrorList errors={errors} />
              </div>
            )}
          </Form.List>
        </>
      );
  }
}
