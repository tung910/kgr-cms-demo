import { useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Steps,
  Switch,
  Upload,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';

import {
  createCampaign,
  previewAudience,
  transitionCampaign,
  updateCampaign,
} from '../api/campaignApi';
import {
  CAMPAIGN_CHANNELS,
  DISCOUNT_TYPES,
  OFFER_TYPES,
  SEGMENT_WARRANTY_STATUSES,
  TRIGGER_PRESETS,
} from '../constants/campaignEnums';
import { APP_DEEPLINK_TARGETS } from '../constants/deeplinkTargets';
import {
  SEGMENT_FIRMWARE_VERSIONS,
  SEGMENT_REGIONS,
} from '../constants/segmentOptions';
import { campaignQueries } from '../queries/campaignQueries';
import type { AudienceConditions } from '../schemas/audienceSchemas';
import type {
  Campaign,
  CampaignDraftInput,
  CampaignOffer,
} from '../schemas/campaignSchemas';

export interface CampaignWizardProps {
  open: boolean;
  campaign?: Campaign | null;
  onClose: () => void;
}

interface WizardValues {
  name: string;
  kind: 'manual' | 'trigger';
  channel: 'push' | 'in_app';
  contentVi: string;
  contentEn?: string;
  imageUrl?: string;
  deeplink?: string;
  scheduleType: 'send_now' | 'scheduled';
  runWindow?: [dayjs.Dayjs, dayjs.Dayjs];
  triggerPreset?: 'core_due' | 'warranty_expiring' | 'high_tds';
  frequencyCapPerCustomer: number;
  regions?: string[];
  models?: string[];
  firmwareVersions?: string[];
  warrantyStatuses?: Array<'active' | 'expiring' | 'expired' | 'none'>;
  coreMin?: number;
  coreMax?: number;
  loyaltyMin?: number;
  loyaltyMax?: number;
  tdsMin?: number;
  tdsMax?: number;
  tenureMin?: number;
  tenureMax?: number;
  offerEnabled?: boolean;
  offerType?: 'voucher' | 'loyalty_points';
  voucherCode?: string;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  points?: number;
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  validUntil?: dayjs.Dayjs;
}

const range = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return undefined;
  return {
    ...(min != null ? { min } : {}),
    ...(max != null ? { max } : {}),
  };
};

function buildConditions(values: Partial<WizardValues>): AudienceConditions {
  return {
    regions: values.regions ?? [],
    models: values.models ?? [],
    firmwareVersions: values.firmwareVersions ?? [],
    warrantyStatuses: values.warrantyStatuses ?? [],
    coreRemainingDays: range(values.coreMin, values.coreMax),
    loyaltyPoints: range(values.loyaltyMin, values.loyaltyMax),
    regionTds: range(values.tdsMin, values.tdsMax),
    tenureDays: range(values.tenureMin, values.tenureMax),
  };
}

function buildOffer(values: WizardValues): CampaignOffer | null {
  if (!values.offerEnabled || !values.offerType) return null;
  if (values.offerType === 'voucher') {
    return {
      type: 'voucher',
      ...(values.voucherCode ? { voucherCode: values.voucherCode } : {}),
      ...(values.discountType ? { discountType: values.discountType } : {}),
      ...(values.discountValue != null
        ? { discountValue: values.discountValue }
        : {}),
      ...(values.usageLimitTotal != null
        ? { usageLimitTotal: values.usageLimitTotal }
        : {}),
      ...(values.usageLimitPerCustomer != null
        ? { usageLimitPerCustomer: values.usageLimitPerCustomer }
        : {}),
      ...(values.validUntil
        ? { validUntil: values.validUntil.toISOString() }
        : {}),
    };
  }
  return {
    type: 'loyalty_points',
    ...(values.points != null ? { points: values.points } : {}),
    ...(values.usageLimitPerCustomer != null
      ? { usageLimitPerCustomer: values.usageLimitPerCustomer }
      : {}),
    ...(values.validUntil
      ? { validUntil: values.validUntil.toISOString() }
      : {}),
  };
}

function buildDraftInput(
  values: WizardValues,
  audienceCount: number | null
): CampaignDraftInput {
  const isTrigger = values.kind === 'trigger';
  const scheduleType = isTrigger ? 'send_now' : values.scheduleType;
  const scheduled = !isTrigger && scheduleType === 'scheduled';
  return {
    name: values.name,
    kind: values.kind,
    channel: values.channel,
    contentVi: values.contentVi,
    contentEn: values.contentEn?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    deeplink: values.deeplink?.trim() || null,
    scheduleType,
    startsAt:
      scheduled && values.runWindow ? values.runWindow[0].toISOString() : null,
    endsAt:
      scheduled && values.runWindow ? values.runWindow[1].toISOString() : null,
    triggerPreset: isTrigger ? (values.triggerPreset ?? null) : null,
    frequencyCapPerCustomer: values.frequencyCapPerCustomer ?? 1,
    audience: buildConditions(values),
    audienceCount,
    offer: buildOffer(values),
  };
}

function initialValues(campaign?: Campaign | null): Partial<WizardValues> {
  if (!campaign) {
    return {
      kind: 'manual',
      channel: 'push',
      scheduleType: 'send_now',
      frequencyCapPerCustomer: 1,
    };
  }
  const a = campaign.audience;
  const offer = campaign.offer;
  return {
    name: campaign.name,
    kind: campaign.kind,
    channel: campaign.channel,
    contentVi: campaign.contentVi,
    contentEn: campaign.contentEn ?? undefined,
    imageUrl: campaign.imageUrl ?? undefined,
    deeplink: campaign.deeplink ?? undefined,
    scheduleType: campaign.scheduleType,
    runWindow:
      campaign.startsAt && campaign.endsAt
        ? [dayjs(campaign.startsAt), dayjs(campaign.endsAt)]
        : undefined,
    triggerPreset: campaign.triggerPreset ?? undefined,
    frequencyCapPerCustomer: campaign.frequencyCapPerCustomer,
    regions: a.regions,
    models: a.models,
    firmwareVersions: a.firmwareVersions,
    warrantyStatuses: a.warrantyStatuses,
    coreMin: a.coreRemainingDays?.min,
    coreMax: a.coreRemainingDays?.max,
    loyaltyMin: a.loyaltyPoints?.min,
    loyaltyMax: a.loyaltyPoints?.max,
    tdsMin: a.regionTds?.min,
    tdsMax: a.regionTds?.max,
    tenureMin: a.tenureDays?.min,
    tenureMax: a.tenureDays?.max,
    offerEnabled: offer != null,
    offerType: offer?.type,
    voucherCode: offer?.voucherCode,
    discountType: offer?.discountType,
    discountValue: offer?.discountValue,
    points: offer?.points,
    usageLimitTotal: offer?.usageLimitTotal,
    usageLimitPerCustomer: offer?.usageLimitPerCustomer,
    validUntil: offer?.validUntil ? dayjs(offer.validUntil) : undefined,
  };
}

const STEP_FIELDS: Array<(keyof WizardValues)[]> = [
  ['name', 'channel', 'contentVi', 'scheduleType', 'runWindow'],
  [],
  ['offerType', 'triggerPreset'],
  [],
];

export function CampaignWizard({
  open,
  campaign,
  onClose,
}: CampaignWizardProps) {
  const { t } = useTranslation('campaigns');
  const [form] = Form.useForm<WizardValues>();
  const queryClient = useQueryClient();
  const models = useQuery(modelReferenceQueries.list());

  const [step, setStep] = useState(0);
  const [matched, setMatched] = useState<number | null>(
    campaign?.audienceCount ?? null
  );
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const values = (Form.useWatch([], form) ?? {}) as Partial<WizardValues>;
  const isTrigger = values.kind === 'trigger';
  const conditionsKey = JSON.stringify(buildConditions(values));
  const previewReady = matched !== null && previewKey === conditionsKey;

  const previewMutation = useMutation({
    mutationFn: () => previewAudience(buildConditions(form.getFieldsValue())),
    onSuccess: (data) => {
      setMatched(data.matched);
      setPreviewKey(JSON.stringify(buildConditions(form.getFieldsValue())));
    },
    onError: () => void message.error(t('errors.previewFailed')),
  });

  const persist = async (submitForApproval: boolean) => {
    const parsed = await form.validateFields();
    const input = buildDraftInput(parsed, matched);
    const saved = campaign
      ? await updateCampaign(campaign.id, input)
      : await createCampaign(input);
    if (submitForApproval) {
      await transitionCampaign(saved.id, 'submit');
    }
    return saved;
  };

  const saveMutation = useMutation({
    mutationFn: (submitForApproval: boolean) => persist(submitForApproval),
    onSuccess: (_data, submitForApproval) => {
      void message.success(
        submitForApproval ? t('wizard.submitted') : t('wizard.savedDraft')
      );
      void queryClient.invalidateQueries({ queryKey: campaignQueries.all });
      close();
    },
    onError: () => void message.error(t('errors.saveFailed')),
  });

  const close = () => {
    form.resetFields();
    setStep(0);
    setMatched(null);
    setPreviewKey(null);
    onClose();
  };

  const next = async () => {
    try {
      await form.validateFields(STEP_FIELDS[step]);
    } catch {
      return;
    }
    if (step === 1 && !previewReady) {
      void message.warning(t('wizard.previewRequired'));
      return;
    }
    setStep((value) => Math.min(value + 1, 3));
  };

  const stepItems = [
    { title: t('wizard.steps.content') },
    { title: t('wizard.steps.audience') },
    { title: isTrigger ? t('wizard.steps.trigger') : t('wizard.steps.offer') },
    { title: t('wizard.steps.review') },
  ];

  return (
    <Modal
      title={campaign ? t('wizard.editTitle') : t('wizard.createTitle')}
      open={open}
      onCancel={close}
      width={760}
      destroyOnHidden
      footer={
        <div className="flex justify-between">
          <Button onClick={close}>{t('wizard.cancel')}</Button>
          <Space>
            {step > 0 ? (
              <Button onClick={() => setStep((value) => value - 1)}>
                {t('wizard.back')}
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="primary" onClick={next}>
                {t('wizard.next')}
              </Button>
            ) : (
              <>
                <Button
                  loading={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(false)}
                >
                  {t('wizard.saveDraft')}
                </Button>
                <Button
                  type="primary"
                  loading={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(true)}
                >
                  {t('wizard.submit')}
                </Button>
              </>
            )}
          </Space>
        </div>
      }
    >
      <Steps size="small" current={step} items={stepItems} className="mb-6" />
      <Form<WizardValues>
        form={form}
        layout="vertical"
        initialValues={initialValues(campaign)}
      >
        {/* Step 1 — content */}
        <div className={step === 0 ? '' : 'hidden'}>
          <Form.Item
            name="name"
            label={t('fields.name')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item name="kind" label={t('fields.kind')}>
              <Select
                options={[
                  { value: 'manual', label: t('kind.manual') },
                  { value: 'trigger', label: t('kind.trigger') },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="channel"
              label={t('fields.channel')}
              rules={[{ required: true }]}
            >
              <Select
                options={CAMPAIGN_CHANNELS.map(({ value, labelKey }) => ({
                  value,
                  label: t(labelKey),
                }))}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="contentVi"
            label={t('fields.contentVi')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="contentEn" label={t('fields.contentEn')}>
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item name="imageUrl" label={t('fields.imageUrl')}>
              <ImageUploadField />
            </Form.Item>
            <Form.Item name="deeplink" label={t('fields.deeplink')}>
              <Select
                allowClear
                placeholder={t('fields.deeplinkPlaceholder')}
                options={APP_DEEPLINK_TARGETS.map(({ value, labelKey }) => ({
                  value,
                  label: t(labelKey),
                }))}
              />
            </Form.Item>
          </div>
          {!isTrigger ? (
            <>
              <Form.Item name="scheduleType" label={t('fields.scheduleType')}>
                <Select
                  options={[
                    { value: 'send_now', label: t('schedule.send_now') },
                    { value: 'scheduled', label: t('schedule.scheduled') },
                  ]}
                />
              </Form.Item>
              {values.scheduleType === 'scheduled' ? (
                <Form.Item
                  name="runWindow"
                  label={t('fields.runWindow')}
                  rules={[{ required: true }]}
                >
                  <DatePicker.RangePicker showTime className="w-full" />
                </Form.Item>
              ) : null}
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message={t('wizard.triggerScheduleHint')}
            />
          )}
        </div>

        {/* Step 2 — audience */}
        <div className={step === 1 ? '' : 'hidden'}>
          <p className="mb-4 text-sm text-[#636466]">
            {t('wizard.audienceHint')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item name="regions" label={t('fields.regions')}>
              <Select
                mode="multiple"
                allowClear
                placeholder={t('fields.anyPlaceholder')}
                options={SEGMENT_REGIONS.map((region) => ({
                  value: region,
                  label: region,
                }))}
              />
            </Form.Item>
            <Form.Item name="models" label={t('fields.models')}>
              <Select
                mode="multiple"
                allowClear
                loading={models.isFetching}
                placeholder={t('fields.anyPlaceholder')}
                options={models.data?.map((model) => ({
                  value: model.code,
                  label: model.code,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="firmwareVersions"
              label={t('fields.firmwareVersions')}
            >
              <Select
                mode="multiple"
                allowClear
                placeholder={t('fields.anyPlaceholder')}
                options={SEGMENT_FIRMWARE_VERSIONS.map((version) => ({
                  value: version,
                  label: version,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="warrantyStatuses"
              label={t('fields.warrantyStatuses')}
            >
              <Select
                mode="multiple"
                allowClear
                placeholder={t('fields.anyPlaceholder')}
                options={SEGMENT_WARRANTY_STATUSES.map(
                  ({ value, labelKey }) => ({ value, label: t(labelKey) })
                )}
              />
            </Form.Item>
          </div>
          <Divider titlePlacement="start" plain>
            {t('wizard.rangeConditions')}
          </Divider>
          <div className="grid gap-4 sm:grid-cols-2">
            <RangeField
              label={t('fields.coreRemainingDays')}
              minName="coreMin"
              maxName="coreMax"
            />
            <RangeField
              label={t('fields.loyaltyPoints')}
              minName="loyaltyMin"
              maxName="loyaltyMax"
            />
            <RangeField
              label={t('fields.regionTds')}
              minName="tdsMin"
              maxName="tdsMax"
            />
            <RangeField
              label={t('fields.tenureDays')}
              minName="tenureMin"
              maxName="tenureMax"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-[#F3F4F4] p-4">
            <Button
              type="primary"
              ghost
              loading={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {t('wizard.previewButton')}
            </Button>
            {matched !== null ? (
              <span className="text-sm font-semibold text-[#020204]">
                {t('wizard.previewResult', { count: matched })}
              </span>
            ) : (
              <span className="text-sm text-[#636466]">
                {t('wizard.previewPlaceholder')}
              </span>
            )}
            {matched !== null && !previewReady ? (
              <span className="text-xs text-[#D4380D]">
                {t('wizard.previewStale')}
              </span>
            ) : null}
          </div>
        </div>

        {/* Step 3 — offer or trigger */}
        <div className={step === 2 ? '' : 'hidden'}>
          {isTrigger ? (
            <Form.Item
              name="triggerPreset"
              label={t('fields.triggerPreset')}
              rules={[{ required: true }]}
            >
              <Select
                options={TRIGGER_PRESETS.map(({ value, labelKey }) => ({
                  value,
                  label: t(labelKey),
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="frequencyCapPerCustomer"
            label={t('fields.frequencyCap')}
            tooltip={t('fields.frequencyCapHint')}
          >
            <InputNumber min={0} max={30} className="w-full" />
          </Form.Item>
          <Divider titlePlacement="start" plain>
            {t('wizard.offerSection')}
          </Divider>
          <Form.Item
            name="offerEnabled"
            label={t('fields.offerEnabled')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {values.offerEnabled ? (
            <>
              <Form.Item name="offerType" label={t('fields.offerType')}>
                <Select
                  options={OFFER_TYPES.map(({ value, labelKey }) => ({
                    value,
                    label: t(labelKey),
                  }))}
                />
              </Form.Item>
              {values.offerType === 'voucher' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Form.Item name="voucherCode" label={t('fields.voucherCode')}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="discountType"
                    label={t('fields.discountType')}
                  >
                    <Select
                      options={DISCOUNT_TYPES.map(({ value, labelKey }) => ({
                        value,
                        label: t(labelKey),
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="discountValue"
                    label={t('fields.discountValue')}
                  >
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item
                    name="usageLimitTotal"
                    label={t('fields.usageLimitTotal')}
                  >
                    <InputNumber min={1} className="w-full" />
                  </Form.Item>
                </div>
              ) : values.offerType === 'loyalty_points' ? (
                <Form.Item name="points" label={t('fields.points')}>
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Form.Item
                  name="usageLimitPerCustomer"
                  label={t('fields.usageLimitPerCustomer')}
                >
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
                <Form.Item name="validUntil" label={t('fields.validUntil')}>
                  <DatePicker className="w-full" />
                </Form.Item>
              </div>
            </>
          ) : null}
        </div>

        {/* Step 4 — review */}
        <div className={step === 3 ? '' : 'hidden'}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('fields.name')}>
              {values.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('fields.kind')}>
              {t(`kind.${values.kind ?? 'manual'}`)}
            </Descriptions.Item>
            <Descriptions.Item label={t('fields.channel')}>
              {values.channel ? t(`channel.${values.channel}`) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('fields.scheduleType')}>
              {isTrigger
                ? t('wizard.triggerAlways')
                : t(`schedule.${values.scheduleType ?? 'send_now'}`)}
            </Descriptions.Item>
            <Descriptions.Item label={t('wizard.audienceLabel')}>
              {matched !== null
                ? t('wizard.previewResult', { count: matched })
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('fields.offerEnabled')}>
              {values.offerEnabled && values.offerType
                ? t(`offer.type.${values.offerType}`)
                : t('wizard.noOffer')}
            </Descriptions.Item>
          </Descriptions>
          <Alert
            className="mt-4"
            type="info"
            showIcon
            message={t('wizard.reviewHint')}
          />
        </div>
      </Form>
    </Modal>
  );
}

// Image input (spec 7.1.a, decision #1): the demo accepts an uploaded image and
// keeps it inline as a data URL — it never takes an external URL and never
// uploads to a server. Controlled by Form.Item (value/onChange).
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(png|jpeg|webp)$/;

function ImageUploadField({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value?: string) => void;
}) {
  const { t } = useTranslation('campaigns');
  const [loading, setLoading] = useState(false);

  const beforeUpload = (file: File) => {
    if (!IMAGE_TYPES.test(file.type)) {
      void message.error(t('errors.imageType'));
      return Upload.LIST_IGNORE;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      void message.error(t('errors.imageSize'));
      return Upload.LIST_IGNORE;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange?.(typeof reader.result === 'string' ? reader.result : undefined);
      setLoading(false);
    };
    reader.onerror = () => {
      void message.error(t('errors.imageType'));
      setLoading(false);
    };
    reader.readAsDataURL(file);
    // Returning false keeps the file local — no network upload happens.
    return false;
  };

  return (
    <div className="space-y-2">
      <Upload
        accept="image/png,image/jpeg,image/webp"
        maxCount={1}
        showUploadList={false}
        beforeUpload={beforeUpload}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          {t('fields.imageUpload')}
        </Button>
      </Upload>
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt=""
            className="h-16 w-16 rounded border border-[#E5E6E6] object-cover"
          />
          <Button type="link" danger onClick={() => onChange?.(undefined)}>
            {t('fields.imageRemove')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface RangeFieldProps {
  label: string;
  minName: keyof WizardValues;
  maxName: keyof WizardValues;
}

function RangeField({ label, minName, maxName }: RangeFieldProps) {
  const { t } = useTranslation('campaigns');
  return (
    <div>
      <div className="mb-1 text-sm">{label}</div>
      <Space.Compact className="w-full">
        <Form.Item name={minName} noStyle>
          <InputNumber
            min={0}
            placeholder={t('fields.min')}
            className="w-full"
          />
        </Form.Item>
        <Form.Item name={maxName} noStyle>
          <InputNumber
            min={0}
            placeholder={t('fields.max')}
            className="w-full"
          />
        </Form.Item>
      </Space.Compact>
    </div>
  );
}
