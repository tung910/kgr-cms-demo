import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Form,
  InputNumber,
  Radio,
  Select,
  Spin,
} from 'antd';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
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
    <div className="flex items-center gap-2">
      <Form.Item name={minName} noStyle>
        <InputNumber min={0} placeholder={t('fields.min')} addonAfter={unit} />
      </Form.Item>
      <span>–</span>
      <Form.Item name={maxName} noStyle>
        <InputNumber min={0} placeholder={t('fields.max')} addonAfter={unit} />
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
        <p className="m-0 text-sm text-[#636466]">
          {t('audience.noConditions')}
        </p>
      ) : null}
      {active.map((field) => {
        const meta = SEGMENT_FIELDS.find((item) => item.value === field);
        return (
          <div
            key={field}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#D5D7D8] p-2"
          >
            <span className="w-40 shrink-0 text-sm font-medium">
              {meta ? t(meta.labelKey) : field}
            </span>
            <div className="min-w-48 flex-1">
              <ConditionControl field={field} />
            </div>
            <Button
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
      className="mt-4 rounded-xl border border-[#E7E8E9] bg-[#F7F8F8] p-4"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
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
        <div className="space-y-1 text-sm">
          <p className="m-0">
            {t('audience.eligible')}:{' '}
            <b>{data.eligible.toLocaleString('vi')}</b>
          </p>
          <p className="m-0">
            {t('audience.reach')}: <b>{data.matched.toLocaleString('vi')}</b>{' '}
            <span className="text-xs text-[#636466]">
              {t('audience.reachHint')}
            </span>
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
export function StepAudience({ preview }: { preview: AudiencePreviewState }) {
  const { t } = useTranslation('campaigns');
  return (
    <>
      <SegmentBuilder />

      <Form.Item
        name="dedupe"
        label={t('fields.dedupe')}
        className="mt-4"
        tooltip={t('fields.dedupeHint')}
      >
        <Radio.Group
          options={DEDUPE_MODES.map(({ value, labelKey }) => ({
            value,
            label: t(labelKey),
          }))}
        />
      </Form.Item>

      <fieldset className="mb-2 rounded-lg border border-[#E7E8E9] p-3">
        <legend className="px-1 text-sm font-medium">
          {t('fields.suppression')}
        </legend>
        <Checkbox checked disabled className="mb-1">
          {t('fields.suppressOptOut')}
        </Checkbox>
        <Form.Item
          name="suppressRecent"
          valuePropName="checked"
          className="mb-1"
        >
          <Checkbox>{t('fields.suppressRecent')}</Checkbox>
        </Form.Item>
        <Form.Item name="suppressTest" valuePropName="checked" className="mb-0">
          <Checkbox>{t('fields.suppressTest')}</Checkbox>
        </Form.Item>
      </fieldset>

      <PreviewPanel preview={preview} />

      <PermissionGuard capability="campaign.frequency.config">
        <Collapse
          ghost
          className="mt-2"
          items={[
            {
              key: 'advanced',
              label: t('wizard.advanced'),
              forceRender: true,
              children: (
                <Form.Item
                  name="frequencyCap"
                  label={t('fields.frequencyCap')}
                  tooltip={t('fields.frequencyCapHint')}
                  className="mb-0"
                >
                  <InputNumber min={0} precision={0} />
                </Form.Item>
              ),
            },
          ]}
        />
      </PermissionGuard>
    </>
  );
}
