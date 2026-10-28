import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  InputNumber,
  Radio,
  Select,
  Spin,
  Switch,
} from 'antd';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';
import { PRODUCT_CONNECTIVITIES } from '@/shared/constants/productConnectivity';

import {
  AUDIENCE_LOGICS,
  DEDUPE_MODES,
  SEGMENT_WARRANTY_STATUSES,
  USAGE_TYPES,
} from '../../constants/campaignEnums';
import {
  SEGMENT_FIRMWARE_VERSIONS,
  SEGMENT_REGIONS,
} from '../../constants/segmentOptions';
import type { AudiencePreview } from '../../schemas/audienceSchemas';
import type { PromotedPackage } from '../../schemas/campaignSchemas';
import {
  SEGMENT_FIELDS,
  type SegmentField,
  type WizardValues,
} from './wizardValues';

export interface AudiencePreviewState {
  loading: boolean;
  failed: boolean;
  data: AudiencePreview | null;
  onRefresh: () => void;
}

function RangeInputs({
  minName,
  maxName,
  unit,
}: {
  minName: keyof WizardValues;
  maxName: keyof WizardValues;
  unit: string;
}) {
  const { t } = useTranslation('campaigns');
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <Form.Item name={minName} noStyle>
        <InputNumber
          className="w-full"
          min={0}
          placeholder={t('fields.min')}
          addonAfter={unit}
        />
      </Form.Item>
      <span>–</span>
      <Form.Item name={maxName} noStyle>
        <InputNumber
          className="w-full"
          min={0}
          placeholder={t('fields.max')}
          addonAfter={unit}
        />
      </Form.Item>
    </div>
  );
}

function ConditionControl({ field }: { field: SegmentField }) {
  const { t } = useTranslation('campaigns');
  const models = useQuery(modelReferenceQueries.list());
  switch (field) {
    case 'regions':
      return (
        <Form.Item name="regions" noStyle>
          <Select
            className="w-full"
            mode="multiple"
            allowClear
            placeholder={t('fields.pickPlaceholder')}
            options={SEGMENT_REGIONS.map((region) => ({
              value: region,
              label: region,
            }))}
          />
        </Form.Item>
      );
    case 'models':
      return (
        <Form.Item name="models" noStyle>
          <Select
            className="w-full"
            mode="multiple"
            allowClear
            loading={models.isFetching}
            placeholder={t('fields.pickPlaceholder')}
            options={models.data?.map((model) => ({
              value: model.code,
              label: model.code,
            }))}
          />
        </Form.Item>
      );
    case 'warrantyStatuses':
      return (
        <Form.Item name="warrantyStatuses" noStyle>
          <Select
            className="w-full"
            mode="multiple"
            allowClear
            placeholder={t('fields.pickPlaceholder')}
            options={SEGMENT_WARRANTY_STATUSES.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
      );
    case 'usageTypes':
      return (
        <Form.Item name="usageTypes" noStyle>
          <Select
            className="w-full"
            mode="multiple"
            allowClear
            placeholder={t('fields.pickPlaceholder')}
            options={USAGE_TYPES.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
      );
    case 'firmwareVersions':
      return (
        <Form.Item name="firmwareVersions" noStyle>
          <Select
            className="w-full"
            mode="multiple"
            allowClear
            placeholder={t('fields.pickPlaceholder')}
            options={SEGMENT_FIRMWARE_VERSIONS.map((version) => ({
              value: version,
              label: version,
            }))}
          />
        </Form.Item>
      );
    case 'connectivities':
      return (
        <Form.Item name="connectivities" noStyle>
          <Select
            className="w-full"
            mode="multiple"
            allowClear
            placeholder={t('fields.pickPlaceholder')}
            options={PRODUCT_CONNECTIVITIES.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey, { ns: 'common' }),
            }))}
          />
        </Form.Item>
      );
    case 'coreRemainingDays':
      return (
        <RangeInputs
          minName="coreMin"
          maxName="coreMax"
          unit={t('unit.days')}
        />
      );
    case 'regionTds':
      return <RangeInputs minName="tdsMin" maxName="tdsMax" unit="ppm" />;
    case 'loyaltyPoints':
      return (
        <RangeInputs
          minName="loyaltyMin"
          maxName="loyaltyMax"
          unit={t('unit.points')}
        />
      );
  }
}

function SegmentBuilder() {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const active = Form.useWatch('activeFields', form) ?? [];
  const available = SEGMENT_FIELDS.filter(
    (field) => !active.includes(field.value)
  );
  const toOption = (field: (typeof SEGMENT_FIELDS)[number]) => ({
    value: field.value,
    label: t(field.labelKey),
  });
  const groups = [
    {
      label: t('audience.basicGroup'),
      options: available.filter((field) => !field.advanced).map(toOption),
    },
    {
      label: t('audience.advancedGroup'),
      options: available.filter((field) => field.advanced).map(toOption),
    },
  ].filter((group) => group.options.length > 0);

  return (
    <div className="space-y-3">
      <Form.Item name="activeFields" hidden noStyle>
        <input type="hidden" />
      </Form.Item>
      {active.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-[#D5D7D8] bg-[#F7F8F8] p-4 text-sm text-[#636466]">
          {t('audience.noConditions')}
        </p>
      ) : null}
      {active.map((field) => {
        const meta = SEGMENT_FIELDS.find((item) => item.value === field);
        return (
          <div
            key={field}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border border-[#E7E8E9] bg-[#F7F8F8] p-3"
          >
            <span className="text-sm font-medium">
              {meta ? t(meta.labelKey) : field}
            </span>
            <div className="col-start-1 row-start-2 min-w-0">
              <ConditionControl field={field} />
            </div>
            <Button
              className="col-start-2 row-span-2 row-start-1 self-start"
              type="text"
              aria-label={t('audience.remove')}
              icon={<CloseOutlined />}
              onClick={() =>
                form.setFieldValue(
                  'activeFields',
                  active.filter((item) => item !== field)
                )
              }
            />
          </div>
        );
      })}
      {groups.length > 0 ? (
        <Select
          className="w-full sm:w-72"
          key={active.length}
          value={undefined}
          placeholder={t('audience.add')}
          options={groups}
          onSelect={(field) =>
            form.setFieldValue('activeFields', [...active, field])
          }
        />
      ) : null}
      {active.length > 1 ? (
        <Form.Item name="logic" label={t('fields.logic')} className="mb-0">
          <Radio.Group
            className="flex flex-col gap-2"
            options={AUDIENCE_LOGICS.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
      ) : null}
    </div>
  );
}

function PreviewPanel({ preview }: { preview: AudiencePreviewState }) {
  const { t } = useTranslation('campaigns');
  const { data } = preview;
  return (
    <div
      className="rounded-xl border border-[#E7E8E9] bg-[#F7F8F8] p-4"
      aria-live="polite"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {t('audience.previewTitle')}
        </span>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={preview.loading}
          onClick={preview.onRefresh}
        >
          {t('audience.recalculate')}
        </Button>
      </div>
      {preview.failed ? (
        <Alert type="error" showIcon title={t('errors.previewFailed')} />
      ) : !data ? (
        <Spin size="small" />
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#E7E8E9] bg-white p-3">
              <p className="m-0 text-[#636466]">{t('audience.eligible')}</p>
              <p className="mb-0 mt-1 text-2xl font-semibold tabular-nums">
                {data.eligible.toLocaleString('vi')}
              </p>
            </div>
            <div className="rounded-lg border border-[#E7E8E9] bg-white p-3">
              <p className="m-0 text-[#636466]">{t('audience.reach')}</p>
              <p className="mb-0 mt-1 text-2xl font-semibold tabular-nums">
                {data.matched.toLocaleString('vi')}
              </p>
            </div>
          </div>
          <p className="m-0 text-xs text-[#636466]">
            {t('audience.reachHint')}
          </p>
          {data.matchedNonIot > 0 ? (
            <p className="m-0 text-xs text-[#636466]">
              {t('audience.nonIot', { count: data.matchedNonIot })}
            </p>
          ) : null}
          {data.sample.length > 0 ? (
            <p className="m-0 text-xs text-[#636466]">
              {t('audience.sample', {
                names: data.sample.map((customer) => customer.name).join(', '),
              })}
              {data.piiMasked ? ` · ${t('audience.piiMasked')}` : ''}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// B3 — who receives it: conditions, de-duplication, exclusions and the reach
// preview (the author must see the real number before continuing).
export function StepAudience({
  preview,
  promotedPackage,
}: {
  preview: AudiencePreviewState;
  promotedPackage?: PromotedPackage;
}) {
  const { t } = useTranslation('campaigns');
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <h3 className="mb-3 mt-0 text-sm font-semibold">
          {t('audienceConditionsTitle')}
        </h3>
        <SegmentBuilder />
      </section>

      {/* Stays registered (hidden) without a package so the value survives. */}
      <section
        className={`rounded-xl border border-[#E7E8E9] p-4 ${
          promotedPackage ? '' : 'hidden'
        }`}
      >
        <Form.Item
          name="excludePackageOwners"
          valuePropName="checked"
          label={t('package.excludeOwners', { code: promotedPackage?.code })}
          tooltip={t('package.excludeOwnersHint')}
          className="mb-0"
        >
          <Switch />
        </Form.Item>
      </section>

      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item
          name="dedupe"
          label={t('fields.dedupe')}
          className="mb-0"
          tooltip={t('fields.dedupeHint')}
        >
          <Radio.Group
            className="flex flex-col gap-3"
            options={DEDUPE_MODES.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
      </section>

      <fieldset className="m-0 min-w-0 rounded-xl border border-[#E7E8E9] p-4">
        <legend className="px-1 text-sm font-medium">
          {t('fields.suppression')}
        </legend>
        <Checkbox checked disabled className="mb-3">
          {t('fields.suppressOptOut')}
        </Checkbox>
        <Form.Item
          name="suppressRecent"
          valuePropName="checked"
          className="mb-3"
        >
          <Checkbox>{t('fields.suppressRecent')}</Checkbox>
        </Form.Item>
        <Form.Item name="suppressTest" valuePropName="checked" className="mb-0">
          <Checkbox>{t('fields.suppressTest')}</Checkbox>
        </Form.Item>
      </fieldset>

      <PreviewPanel preview={preview} />
    </div>
  );
}
