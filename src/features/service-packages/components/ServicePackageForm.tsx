import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';
import { ApiError, getApiErrorCode } from '@/core/api/error';
import { PortalCard } from '@/shared/components/portal';

import {
  BILLING_TYPES,
  SERVICE_PACKAGE_GROUPS,
} from '../constants/servicePackage';
import {
  getServiceBillingTypes,
  MODEL_SCOPES,
  PRICING_MODES,
  SERVICE_PACKAGE_TYPES,
  type ServiceTypeCode,
} from '../constants/servicePackageTypes';
import { mapServicePackageDraftInput } from '../api/servicePackageMapper';
import { servicePackageQueries } from '../queries/servicePackageQueries';
import type { ServicePackageConfiguration } from '../schemas/servicePackageConfiguration';
import {
  servicePackageDraftInputSchema,
  type QuotaMode,
  type ServicePackageDraftDto,
  type ServicePackageDraftInput,
} from '../schemas/servicePackageSchemas';
import {
  computeEntitlementQuota,
  getAutoAttachBlockers,
  getEntitlementKind,
} from '../utils/entitlementRules';
import {
  ServicePackageConfigurationFields,
  ServicePackageTextList,
} from './ServicePackageConfigurationFields';
import { ServicePackagePreview } from './ServicePackagePreview';

// The create-form's local Form values differ from `ServicePackageDraftDto` in
// one spot: while editing, `auto_attach_from` is a Ant Design `DatePicker`
// value (a `Dayjs`), not yet the ISO date string the wire schema expects —
// that conversion happens once, in `review()`, right before validation.
type ServicePackageFormValues = Omit<
  Partial<ServicePackageDraftDto>,
  'auto_attach_from'
> &
  Record<string, unknown> & { auto_attach_from?: Dayjs | null };

export function ServicePackageForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (input: ServicePackageDraftInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation('servicePackages');
  const [form] = Form.useForm<ServicePackageFormValues>();
  const values =
    Form.useWatch<ServicePackageFormValues>([], {
      form,
      preserve: true,
    }) ?? {};
  const [dirty, setDirty] = useState(false);
  const saved = useRef(false);
  const saving = useRef(false);
  const [preview, setPreview] = useState<ServicePackageDraftInput | null>(null);
  const models = useQuery(modelReferenceQueries.list());
  const packages = useQuery({
    ...servicePackageQueries.components(),
    enabled: values.service_type_code === 'TG-ALL',
  });
  const [modal, contextHolder] = Modal.useModal();
  useBlocker({
    shouldBlockFn: async () => {
      if (saved.current) return false;
      if (isSubmitting) return true;
      if (!dirty) return false;
      return !(await modal.confirm({
        title: t('create.leaveTitle'),
        content: t('create.leaveDescription'),
        okText: t('create.leave'),
        cancelText: t('create.stay'),
      }));
    },
    enableBeforeUnload: () => !saved.current && (dirty || isSubmitting),
  });
  const type = SERVICE_PACKAGE_TYPES.find(
    (item) => item.value === values.service_type_code
  );
  const kind = type ? getEntitlementKind(type.value) : null;
  const quotaMode: QuotaMode = (values.quota_mode as QuotaMode) ?? 'default';
  const liveConfiguration = type
    ? ({
        ...(values.configuration as object),
        type: type.value,
      } as ServicePackageConfiguration)
    : null;
  const autoAttachBlockers = type
    ? getAutoAttachBlockers({
        group: type.group,
        termMonths: values.term_months ?? null,
        quotaMode,
        customQuota: values.custom_quota ?? null,
        details: {
          pricingMode: values.pricing_mode ?? 'fixed',
          configuration: liveConfiguration as ServicePackageConfiguration,
        },
      })
    : [];
  const computedQuota =
    kind === 'counted' && liveConfiguration
      ? computeEntitlementQuota(
          liveConfiguration,
          values.term_months ?? null,
          quotaMode,
          values.custom_quota ?? null
        )
      : null;
  const required = [
    { required: true, whitespace: true, message: t('create.required') },
  ];
  const numericRequired = [
    {
      required: true,
      type: 'integer' as const,
      min: 1,
      message: t('create.positiveInteger'),
    },
  ];
  const text = (
    name:
      | 'purpose'
      | 'eligibility_description'
      | 'pricing_description'
      | 'additional_cost_description',
    mandatory = true
  ) => (
    <Form.Item
      name={name}
      label={t(`create.fields.${name}`)}
      rules={mandatory ? required : []}
    >
      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
    </Form.Item>
  );

  const review = () => {
    const current = form.getFieldsValue(true);
    const parsed = servicePackageDraftInputSchema.safeParse({
      ...current,
      code: current.code?.trim().toUpperCase(),
      group: type?.group,
      configuration: {
        ...(['LD-STD', 'LD-PRO'].includes(current.service_type_code ?? '')
          ? { appointment: false, address: false }
          : {}),
        ...current.configuration,
        type: current.service_type_code,
      },
      price:
        current.pricing_mode === 'quotation'
          ? null
          : current.pricing_mode === 'free_or_included'
            ? 0
            : current.price,
      billing_period_months:
        current.billing_type === 'one_time'
          ? null
          : (current.billing_period_months ?? null),
      term_months: current.term_months ?? null,
      eligible_model_ids:
        current.model_scope === 'all' ? [] : (current.eligible_model_ids ?? []),
      eligible_model_count:
        current.model_scope === 'all'
          ? (models.data?.length ?? 0)
          : (current.eligible_model_ids?.length ?? 0),
      excluded_items: current.excluded_items ?? [],
      description: current.description?.trim() || null,
      pricing_description: current.pricing_description?.trim() || null,
      additional_cost_description:
        current.additional_cost_description?.trim() || null,
      quota_mode: current.quota_mode ?? 'default',
      custom_quota:
        current.quota_mode === 'custom' ? (current.custom_quota ?? null) : null,
      auto_attach: Boolean(current.auto_attach),
      auto_attach_from: current.auto_attach
        ? (current.auto_attach_from?.format('YYYY-MM-DD') ?? null)
        : null,
    });
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        name: issue.path.filter(
          (key): key is string | number => typeof key !== 'symbol'
        ),
        errors: [
          t(
            issue.code === 'custom'
              ? `create.validation.${issue.message}`
              : 'create.invalidField'
          ),
        ],
      }));
      form.setFields(fields);
      if (fields[0])
        form.scrollToField(fields[0].name, { focus: true, block: 'center' });
      return;
    }
    setPreview(mapServicePackageDraftInput(parsed.data));
  };

  const save = async () => {
    if (!preview || saving.current) return;
    saving.current = true;
    try {
      await onSubmit(preview);
      saved.current = true;
      setDirty(false);
      onCancel();
    } catch (error) {
      setPreview(null);
      if (
        getApiErrorCode(error) === 'duplicateCode' ||
        (error instanceof ApiError && error.status === 409)
      ) {
        form.setFields([{ name: 'code', errors: [t('errors.duplicateCode')] }]);
        form.scrollToField('code', { focus: true });
      }
    } finally {
      saving.current = false;
    }
  };

  return (
    <>
      {contextHolder}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed: Partial<ServicePackageFormValues>) => {
          setDirty(true);
          if ('auto_attach' in changed) {
            if (
              changed.auto_attach &&
              !form.getFieldValue('auto_attach_from')
            ) {
              form.setFieldValue('auto_attach_from', dayjs());
            }
            if (!changed.auto_attach) {
              form.setFieldValue('auto_attach_from', null);
            }
          }
          if ('quota_mode' in changed && changed.quota_mode === 'default') {
            form.setFieldValue('custom_quota', null);
          }
        }}
        onFinish={review}
        scrollToFirstError
        initialValues={{
          included_items: [''],
          excluded_items: [],
          pricing_mode: 'fixed',
          quota_mode: 'default',
          custom_quota: null,
          auto_attach: false,
          auto_attach_from: null,
        }}
        disabled={isSubmitting}
      >
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-5">
            <PortalCard
              title={
                <h2 className="m-0 text-base font-semibold">
                  {t('create.typeTitle')}
                </h2>
              }
            >
              <Form.Item
                label={t('create.typeLabel')}
                required
                htmlFor="service-type-select"
              >
                <Form.Item
                  name="service_type_code"
                  hidden
                  rules={[{ required: true, message: t('create.required') }]}
                >
                  <Input />
                </Form.Item>
                <Select<ServiceTypeCode>
                  id="service-type-select"
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                  placeholder={t('create.typePlaceholder')}
                  value={values.service_type_code}
                  onChange={async (next) => {
                    if (
                      type &&
                      next !== type.value &&
                      dirty &&
                      !(await modal.confirm({
                        title: t('create.changeTypeTitle'),
                        content: t('create.changeTypeDescription'),
                        okText: t('create.changeType'),
                        cancelText: t('create.stay'),
                      }))
                    )
                      return;
                    if (next === type?.value) return;
                    const billing = getServiceBillingTypes(next)[0];
                    form.setFieldsValue({
                      service_type_code: next,
                      configuration: undefined,
                      billing_type: billing,
                      billing_period_months: null,
                      term_months: null,
                      quota_mode: 'default',
                      custom_quota: null,
                      auto_attach: false,
                      auto_attach_from: null,
                    });
                    form.setFields(
                      form
                        .getFieldsError()
                        .map(({ name }) => ({ name, errors: [] }))
                    );
                    setDirty(true);
                  }}
                  options={SERVICE_PACKAGE_GROUPS.map((group) => ({
                    label: t(group.labelKey),
                    options: SERVICE_PACKAGE_TYPES.filter(
                      (item) => item.group === group.value
                    ).map((item) => ({
                      value: item.value,
                      label: `${item.value} — ${t(item.labelKey)}`,
                    })),
                  }))}
                />
              </Form.Item>
              {type ? (
                <p className="mb-0 text-sm text-slate-500">
                  {t(`create.purposes.${type.value}`)}
                </p>
              ) : (
                <p className="mb-0 text-sm text-slate-500">
                  {t('create.chooseTypeHint')}
                </p>
              )}
            </PortalCard>
            {type ? (
              <>
                <PortalCard
                  title={
                    <h2 className="m-0 text-base font-semibold">
                      {t('create.contentTitle')}
                    </h2>
                  }
                >
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item
                      name="code"
                      label={t('form.codeLabel')}
                      rules={[
                        {
                          required: true,
                          pattern: /^[A-Za-z0-9][A-Za-z0-9-]*$/,
                          message: t('form.validation.codeRequired'),
                        },
                      ]}
                      normalize={(value: string) => value.toUpperCase()}
                    >
                      <Input placeholder={`${type.value}-12M`} />
                    </Form.Item>
                    <Form.Item
                      name="name"
                      label={t('form.nameLabel')}
                      rules={required}
                    >
                      <Input />
                    </Form.Item>
                  </div>
                  {text('purpose')}
                  <Form.Item
                    name="description"
                    label={t('form.descriptionLabel')}
                  >
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                  <ServicePackageTextList
                    name="included_items"
                    label={t('create.fields.included_items')}
                  />
                  <ServicePackageTextList
                    name="excluded_items"
                    label={t('create.fields.excluded_items')}
                    required={false}
                  />
                </PortalCard>
                <PortalCard
                  title={
                    <h2 className="m-0 text-base font-semibold">
                      {t('create.modelTitle')}
                    </h2>
                  }
                >
                  {text('eligibility_description')}
                  <Form.Item
                    name="model_scope"
                    label={t('create.modelScopeLabel')}
                    rules={[{ required: true, message: t('create.required') }]}
                  >
                    <Radio.Group
                      options={MODEL_SCOPES.map((item) => ({
                        value: item.value,
                        label: t(item.labelKey),
                      }))}
                    />
                  </Form.Item>
                  {models.isError ? (
                    <Alert
                      type="error"
                      title={t('create.modelError')}
                      action={
                        <Button onClick={() => void models.refetch()}>
                          {t('create.retry')}
                        </Button>
                      }
                    />
                  ) : null}
                  {values.model_scope === 'all' ? (
                    <p className="text-sm text-slate-500">
                      {t('create.allModelsHint')}
                    </p>
                  ) : values.model_scope === 'selected' ? (
                    <Form.Item
                      name="eligible_model_ids"
                      label={t('create.selectModels')}
                      rules={[
                        {
                          required: true,
                          type: 'array',
                          min: 1,
                          message: t('create.required'),
                        },
                      ]}
                    >
                      <Select
                        mode="multiple"
                        showSearch
                        optionFilterProp="label"
                        loading={models.isPending}
                        disabled={models.isError}
                        options={models.data?.map((model) => ({
                          value: model.id,
                          label: `${model.code} — ${model.name}`,
                        }))}
                      />
                    </Form.Item>
                  ) : null}
                </PortalCard>
                <PortalCard
                  title={
                    <h2 className="m-0 text-base font-semibold">
                      {t('create.priceTitle')}
                    </h2>
                  }
                >
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item
                      name="pricing_mode"
                      label={t('create.pricingLabel')}
                      rules={[{ required: true }]}
                    >
                      <Select
                        options={PRICING_MODES.map((item) => ({
                          value: item.value,
                          label: t(item.labelKey),
                        }))}
                      />
                    </Form.Item>
                    {values.pricing_mode === 'fixed' ? (
                      <Form.Item
                        name="price"
                        label={t('form.priceLabel')}
                        rules={numericRequired}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    ) : null}
                  </div>
                  {text('pricing_description', values.pricing_mode !== 'fixed')}
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item
                      name="billing_type"
                      label={t('form.billingTypeLabel')}
                      rules={[
                        { required: true, message: t('create.required') },
                      ]}
                    >
                      <Select
                        options={BILLING_TYPES.filter((item) =>
                          getServiceBillingTypes(type.value).includes(
                            item.value
                          )
                        ).map((item) => ({
                          value: item.value,
                          label: t(item.labelKey),
                        }))}
                      />
                    </Form.Item>
                    {values.billing_type &&
                    values.billing_type !== 'one_time' ? (
                      <Form.Item
                        name="billing_period_months"
                        label={t('form.billingPeriodLabel')}
                        rules={numericRequired}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item
                      name="term_months"
                      label={t('form.termLabel')}
                      rules={
                        [
                          'BH-EXT',
                          'BH-ADP',
                          'BH-CMP',
                          'BT-CLN',
                          'TG-ALL',
                          'TG-SUB',
                        ].includes(type.value)
                          ? numericRequired
                          : []
                      }
                    >
                      <InputNumber
                        min={1}
                        precision={0}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>
                  {text('additional_cost_description', false)}
                </PortalCard>
                <PortalCard
                  title={
                    <h2 className="m-0 text-base font-semibold">
                      {t('create.configurationTitle', {
                        type: t(type.labelKey),
                      })}
                    </h2>
                  }
                >
                  <p className="mt-0 text-sm text-slate-500">
                    {t('create.configurationHint')}
                  </p>
                  <ServicePackageConfigurationFields
                    key={type.value}
                    type={type.value}
                    packages={packages.data ?? []}
                    loading={packages.isPending}
                    error={packages.isError}
                    onRetry={() => void packages.refetch()}
                  />
                </PortalCard>
                <PortalCard
                  title={
                    <h2 className="m-0 text-base font-semibold">
                      {t('autoAttach.sectionTitle')}
                    </h2>
                  }
                >
                  {kind === 'one_time' || kind === 'counted' ? (
                    <>
                      <Form.Item
                        name="quota_mode"
                        label={t('autoAttach.quotaModeLabel')}
                      >
                        <Radio.Group
                          options={[
                            {
                              value: 'default',
                              label: t('autoAttach.quotaModes.default'),
                            },
                            {
                              value: 'custom',
                              label: t('autoAttach.quotaModes.custom'),
                            },
                          ]}
                        />
                      </Form.Item>
                      {values.quota_mode === 'custom' ? (
                        <Form.Item
                          name="custom_quota"
                          label={t('autoAttach.customQuotaLabel')}
                          rules={numericRequired}
                        >
                          <InputNumber
                            min={1}
                            precision={0}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      ) : null}
                      {kind === 'counted' ? (
                        <p className="text-sm text-slate-500">
                          {t('autoAttach.quotaPreview', {
                            count: computedQuota ?? 0,
                          })}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  <Form.Item
                    name="auto_attach"
                    valuePropName="checked"
                    className="mb-1"
                  >
                    <Checkbox disabled={autoAttachBlockers.length > 0}>
                      {t('autoAttach.checkboxLabel')}
                    </Checkbox>
                  </Form.Item>
                  {autoAttachBlockers.length > 0 ? (
                    <p className="mt-0 text-sm text-amber-600">
                      {t(`autoAttach.blockers.${autoAttachBlockers[0]}`)}
                    </p>
                  ) : values.auto_attach ? (
                    <Form.Item
                      name="auto_attach_from"
                      label={t('autoAttach.effectiveDateLabel')}
                      rules={[
                        { required: true, message: t('create.required') },
                      ]}
                    >
                      <DatePicker
                        className="w-full"
                        format="DD/MM/YYYY"
                        disabledDate={(current) =>
                          !!current && current.isBefore(dayjs(), 'day')
                        }
                      />
                    </Form.Item>
                  ) : null}
                </PortalCard>
              </>
            ) : null}
          </div>
          <aside className="space-y-4 xl:sticky xl:top-5">
            <PortalCard title={t('create.summaryTitle')}>
              <p className="mt-0 font-medium">
                {values.name || t('create.untitled')}
              </p>
              <p className="text-sm text-slate-500">
                {type ? t(type.labelKey) : t('create.typePlaceholder')}
              </p>
              {type ? (
                <p className="text-sm">{t(`groups.${type.group}`)}</p>
              ) : null}
              <p className="text-sm text-slate-500">{t('create.draftHint')}</p>
              <Button
                htmlType="submit"
                type="primary"
                block
                disabled={!type || models.isPending || models.isError}
              >
                {t('create.review')}
              </Button>
              <Button
                block
                className="mt-2"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {t('form.cancel')}
              </Button>
            </PortalCard>
          </aside>
        </div>
      </Form>
      <Modal
        open={preview !== null}
        width={760}
        title={t('create.reviewTitle')}
        onCancel={() => !isSubmitting && setPreview(null)}
        closable={!isSubmitting}
        mask={{ closable: !isSubmitting }}
        keyboard={!isSubmitting}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={isSubmitting} onClick={() => setPreview(null)}>
              {t('create.backToForm')}
            </Button>
            <Button
              type="primary"
              loading={isSubmitting}
              onClick={() => void save()}
            >
              {t('create.saveDraft')}
            </Button>
          </div>
        }
      >
        {preview ? (
          <ServicePackagePreview
            input={preview}
            models={models.data ?? []}
            packages={packages.data ?? []}
          />
        ) : null}
      </Modal>
    </>
  );
}
