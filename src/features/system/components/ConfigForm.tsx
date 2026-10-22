import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { updateSystemConfig } from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import {
  CATALOG_KEYS,
  type CatalogItem,
  type CatalogKey,
  type ConfigParams,
  type SystemConfig,
} from '../schemas/systemSchemas';
import { systemErrorMessage } from '../utils/systemErrors';

export interface ConfigFormProps {
  config: SystemConfig;
  canEdit: boolean;
}

interface FormValues {
  params: ConfigParams;
  catalogs: Record<CatalogKey, CatalogItem[]>;
}

interface NumberField {
  name: keyof Omit<ConfigParams, 'slaBySeverity' | 'alertAutoClose'>;
  min: number;
  max: number;
  step?: number;
}

// Ranges follow the plan (§3.1 SCR-35); the backend validates them again.
const numberFields: NumberField[] = [
  { name: 'campaignCoreDays', min: 1, max: 365 },
  { name: 'campaignQuietStartHour', min: 0, max: 23 },
  { name: 'campaignQuietEndHour', min: 0, max: 23 },
  { name: 'campaignFrequencyLimit', min: 1, max: 100 },
  { name: 'campaignFrequencyDays', min: 1, max: 365 },
  { name: 'campaignAttributionDays', min: 1, max: 365 },
  { name: 'campaignCooldownDays', min: 1, max: 365 },
  { name: 'campaignRepurchaseDays', min: 1, max: 730 },
  { name: 'campaignBookingRevenue', min: 0, max: 100000000 },
  { name: 'campaignQrRevenue', min: 0, max: 100000000 },
  { name: 'tdsThresholdRegion', min: 1, max: 1000 },
  { name: 'otaAutoPauseRate', min: 0.1, max: 100, step: 0.1 },
  { name: 'deviceAckTimeout', min: 5, max: 300 },
  { name: 'warrantyExpiringDays', min: 1, max: 365 },
  { name: 'qrAnomalyRate', min: 0.1, max: 100, step: 0.1 },
  { name: 'loginMaxFailed', min: 1, max: 20 },
  { name: 'lockoutMinutes', min: 1, max: 1440 },
  { name: 'sessionTimeoutMinutes', min: 1, max: 1440 },
  { name: 'passwordMinLength', min: 6, max: 64 },
];

const severities = ['critical', 'medium', 'low'] as const;

export function ConfigForm({ config, canEdit }: ConfigFormProps) {
  const { t } = useTranslation('system');
  const { session } = useAuth();
  const canConfigureFrequency =
    !!session && hasCapability(session.role, 'campaign.frequency.config');
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateSystemConfig,
    onSuccess: () => {
      void message.success(t('config.saved'));
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  const regionOptions = (values: FormValues | undefined) =>
    (values?.catalogs?.region ?? [])
      .filter((item) => item.code)
      .map((item) => ({ value: item.code, label: item.name || item.code }));

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      disabled={!canEdit}
      initialValues={{ params: config.params, catalogs: config.catalogs }}
      onFinish={(values) =>
        mutation.mutate({
          params: values.params,
          catalogs: {
            model: values.catalogs.model,
            core: values.catalogs.core,
            region: values.catalogs.region,
          },
        })
      }
    >
      {!canEdit ? (
        <p className="mb-4 text-sm text-brand-gray">
          {t('config.readOnlyHint')}
        </p>
      ) : null}
      <h3 className="mb-3 text-base font-semibold">
        {t('config.sections.params')}
      </h3>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        {numberFields.map((field) => (
          <Form.Item
            key={field.name}
            name={['params', field.name]}
            label={t(`config.params.${field.name}`)}
            rules={[
              {
                required: true,
                type: 'number',
                min: field.min,
                max: field.max,
              },
            ]}
          >
            <InputNumber
              className="!w-full"
              disabled={
                !canEdit ||
                (!canConfigureFrequency &&
                  (field.name === 'campaignFrequencyLimit' ||
                    field.name === 'campaignFrequencyDays'))
              }
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
            />
          </Form.Item>
        ))}
        <Form.Item
          name={['params', 'alertAutoClose']}
          label={t('config.params.alertAutoClose')}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </div>

      <h3 className="mb-1 mt-4 text-base font-semibold">
        {t('config.sections.sla')}
      </h3>
      <p className="mb-3 text-sm text-brand-gray">{t('config.slaHint')}</p>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        {severities.map((severity) => (
          <Form.Item
            key={severity}
            name={['params', 'slaBySeverity', severity]}
            label={t(`config.sla.${severity}`)}
          >
            <InputNumber
              className="!w-full"
              min={1}
              precision={0}
              placeholder={t('config.slaUnset')}
            />
          </Form.Item>
        ))}
      </div>

      <h3 className="mb-3 mt-4 text-base font-semibold">
        {t('config.sections.catalogs')}
      </h3>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {CATALOG_KEYS.map((key) => (
          <div key={key}>
            <h4 className="mb-2 text-sm font-semibold">
              {t(`config.catalogs.${key}`)}
            </h4>
            <Form.List name={['catalogs', key]}>
              {(fields, { add, remove }) => (
                <div className="space-y-2">
                  {fields.map((field) => (
                    <div key={field.key} className="flex items-start gap-2">
                      <Form.Item
                        name={[field.name, 'code']}
                        className="!mb-0 w-28"
                        rules={[
                          { required: true, whitespace: true },
                          ({ getFieldValue }) => ({
                            validator: (_, value: string) => {
                              const items: CatalogItem[] =
                                getFieldValue(['catalogs', key]) ?? [];
                              return items.filter((item) => item.code === value)
                                .length > 1
                                ? Promise.reject(
                                    new Error(t('config.catalogs.duplicate'))
                                  )
                                : Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <Input
                          aria-label={t('config.catalogs.code')}
                          placeholder={t('config.catalogs.code')}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'name']}
                        className="!mb-0 min-w-0 flex-1"
                        rules={[{ required: true, whitespace: true }]}
                      >
                        <Input
                          aria-label={t('config.catalogs.name')}
                          placeholder={t('config.catalogs.name')}
                        />
                      </Form.Item>
                      {key === 'region' ? (
                        <Form.Item
                          name={[field.name, 'parentCode']}
                          className="!mb-0 w-28"
                        >
                          <Select
                            allowClear
                            aria-label={t('config.catalogs.parent')}
                            placeholder={t('config.catalogs.parent')}
                            options={regionOptions(form.getFieldsValue())}
                          />
                        </Form.Item>
                      ) : null}
                      <Button
                        aria-label={t('config.catalogs.remove')}
                        onClick={() => remove(field.name)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() =>
                      add({ code: '', name: '', parentCode: null })
                    }
                  >
                    {t('config.catalogs.add')}
                  </Button>
                </div>
              )}
            </Form.List>
          </div>
        ))}
      </div>

      {canEdit ? (
        <div className="mt-6">
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </div>
      ) : null}
    </Form>
  );
}
