import {
  Alert,
  Checkbox,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
} from 'antd';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { systemQueries } from '@/features/system/queries/systemQueries';

import {
  CAMPAIGN_KINDS,
  DISPLAY_TYPES,
  NOTIFICATION_GROUPS,
  TRIGGER_PRESETS,
} from '../../constants/campaignEnums';
import { DEFAULT_WIZARD_VALUES, type WizardValues } from './wizardValues';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// B0 — one-off or automatic trigger. Decides what B2 asks for.
export function StepType() {
  const { t } = useTranslation('campaigns');
  return (
    <div className="grid gap-3">
      <p className="m-0 rounded-xl border border-[#E7E8E9] bg-[#F7F8F8] p-4 text-sm text-[#636466]">
        {t('steps.type.hint')}
      </p>
      <Form.Item name="kind" noStyle>
        <Radio.Group style={{ display: 'grid', gap: 12, width: '100%' }}>
          {CAMPAIGN_KINDS.map(({ value, labelKey }) => (
            <Radio
              key={value}
              value={value}
              style={{ margin: 0, padding: 16 }}
              className="m-0 w-full rounded-xl border border-[#E7E8E9] p-4"
            >
              <span className="font-medium">{t(labelKey)}</span>
              <span className="mt-1 block text-sm text-[#636466]">
                {t(`steps.type.${value}Hint`)}
              </span>
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
    </div>
  );
}

// B1 — name, how it is shown, and which notification group it belongs to.
export function StepInfo() {
  const { t } = useTranslation('campaigns');
  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item
          name="name"
          className="mb-0"
          label={t('fields.name')}
          rules={[{ required: true, whitespace: true }]}
        >
          <Input maxLength={120} placeholder={t('fields.namePlaceholder')} />
        </Form.Item>
      </section>
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item name="displayType" label={t('fields.displayType')}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={DISPLAY_TYPES.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="notificationGroup"
          className="mb-0"
          label={t('fields.notificationGroup')}
          tooltip={t('fields.notificationGroupHint')}
        >
          <Select
            className="w-full"
            options={NOTIFICATION_GROUPS.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
      </section>
    </div>
  );
}

// B2 — when it runs: a send time for one-offs, entry/exit rules for triggers.
export function StepMechanism() {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const kind = Form.useWatch('kind', form);
  const scheduleType = Form.useWatch('scheduleType', form);
  const preset = Form.useWatch('triggerPreset', form);
  const watched = Form.useWatch([], form);
  const values: WizardValues = { ...DEFAULT_WIZARD_VALUES, ...watched };
  const { session } = useAuth();
  const canReadConfig = !!session && hasCapability(session.role, 'config.read');
  const config = useQuery({
    ...systemQueries.config(),
    enabled: canReadConfig,
  });
  const params = canReadConfig ? config.data?.params : undefined;
  const frequencyCap = (
    <>
      <p className="mt-0 text-sm" aria-live="polite">
        {params
          ? t('mechanism.cycle', {
              days: params.campaignFrequencyDays,
              limit: params.campaignFrequencyLimit,
            })
          : t('mechanism.cycleUnavailable')}
      </p>
      <p className="text-sm" aria-live="polite">
        {t('mechanism.currentCap', { cap: values.frequencyCap ?? '—' })}
      </p>
      <PermissionGuard capability="campaign.frequency.config">
        <Form.Item
          name="frequencyCap"
          label={t('mechanism.cycleCapLabel')}
          extra={t('mechanism.cycleCapHint')}
          rules={[{ required: true, type: 'integer', min: 0 }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} precision={0} />
        </Form.Item>
      </PermissionGuard>
    </>
  );
  const threshold =
    preset === 'core_due'
      ? t('mechanism.coreThreshold', { days: values.coreDays ?? '—' })
      : !canReadConfig
        ? t('mechanism.thresholdRestricted')
        : config.isError
          ? t('mechanism.thresholdError')
          : !params
            ? t('mechanism.thresholdLoading')
            : preset === 'warranty_expiring'
              ? t('mechanism.warrantyThreshold', {
                  days: params.warrantyExpiringDays,
                })
              : t('mechanism.tdsThreshold', {
                  value: params.tdsThresholdRegion,
                });

  if (kind !== 'trigger') {
    return (
      <div className="grid gap-5">
        <section className="rounded-xl border border-[#E7E8E9] p-4">
          <Form.Item name="scheduleType" label={t('fields.sendTime')}>
            <Radio.Group
              options={[
                { value: 'send_now', label: t('schedule.send_now') },
                { value: 'scheduled', label: t('schedule.scheduled') },
              ]}
            />
          </Form.Item>
          {scheduleType === 'scheduled' ? (
            <Form.Item
              name="scheduledAt"
              label={t('fields.scheduledAt')}
              rules={[
                { required: true },
                {
                  validator: (_, value: dayjs.Dayjs | undefined) =>
                    !value || value.isAfter(dayjs())
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('errors.pastTime'))),
                },
              ]}
            >
              <DatePicker
                className="w-full"
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
              />
            </Form.Item>
          ) : null}
        </section>
        <fieldset className="m-0 min-w-0 rounded-xl border border-[#E7E8E9] p-4">
          <legend className="px-1 text-sm font-medium">
            {t('mechanism.frequencyTitle')}
          </legend>
          {frequencyCap}
        </fieldset>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Alert
        type="info"
        showIcon
        title={t('mechanism.firstSendTitle')}
        description={t('mechanism.firstSendHint')}
      />
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item name="triggerPreset" label={t('fields.triggerPreset')}>
          <Select
            className="w-full"
            options={TRIGGER_PRESETS.map(({ value, labelKey }) => ({
              value,
              label: t(labelKey),
            }))}
          />
        </Form.Item>
        <p className="-mt-3 mb-4 text-xs text-[#636466]">
          {preset ? t(`trigger.hint.${preset}`) : null}
        </p>
        {preset !== 'core_due' ? (
          <p className="mb-4 text-sm" aria-live="polite">
            {threshold}
          </p>
        ) : null}
        {preset === 'core_due' ? (
          <Form.Item
            name="coreDays"
            label={t('fields.coreDays')}
            rules={[{ required: true, type: 'number', min: 1, max: 365 }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={365}
              precision={0}
              addonAfter={t('unit.days')}
            />
          </Form.Item>
        ) : null}
      </section>
      <fieldset className="m-0 min-w-0 rounded-xl border border-[#E7E8E9] p-4">
        <legend className="px-1 text-sm font-medium">{t('fields.exit')}</legend>
        <Form.Item
          name="exitOnPurchase"
          hidden={preset === 'warranty_expiring'}
          valuePropName="checked"
          className="mb-1"
        >
          <Checkbox>{t('fields.exitOnPurchase')}</Checkbox>
        </Form.Item>
        <Form.Item
          name="exitOnWarrantyRenewed"
          hidden={preset !== 'warranty_expiring'}
          valuePropName="checked"
          className="mb-0"
        >
          <Checkbox>{t('fields.exitOnWarrantyRenewed')}</Checkbox>
        </Form.Item>
      </fieldset>
      <fieldset className="m-0 min-w-0 rounded-xl border border-[#E7E8E9] p-4">
        <legend className="px-1 text-sm font-medium">
          {t('mechanism.frequencyTitle')}
        </legend>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="cooldownDays"
            label={t('fields.cooldownDays')}
            extra={t('mechanism.frequencyHint')}
            rules={[{ required: true, type: 'number', min: 0, max: 365 }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={365}
              precision={0}
              addonAfter={t('unit.days')}
            />
          </Form.Item>
          <Form.Item
            name="maxSends"
            label={t('mechanism.totalCapLabel')}
            extra={t('mechanism.reentryHint')}
            rules={[{ required: true, type: 'number', min: 1, max: 100 }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={100}
              precision={0}
            />
          </Form.Item>
        </div>
        {frequencyCap}
      </fieldset>
      <section className="grid gap-x-4 rounded-xl border border-[#E7E8E9] p-4 sm:grid-cols-2">
        <Form.Item
          name="startsOn"
          label={t('fields.startsOn')}
          extra={t('mechanism.startHint')}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item
          name="endsOn"
          label={t('fields.endsOn')}
          extra={t('mechanism.endHint')}
          dependencies={['startsOn']}
          rules={[
            {
              validator: (_, value: dayjs.Dayjs | undefined) => {
                const start = values.startsOn;
                return !value || !start || !value.isBefore(start, 'day')
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('mechanism.invalidWindow')));
              },
            },
          ]}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>
      </section>
      <Collapse
        items={[
          {
            key: 'advanced',
            label: t('wizard.advanced'),
            forceRender: true,
            children: (
              <>
                <p className="text-xs text-[#636466]">
                  {t('mechanism.quietHint')}
                </p>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Form.Item
                    name="quietFrom"
                    label={t('fields.quietFrom')}
                    rules={[
                      { pattern: TIME_PATTERN, message: t('errors.time') },
                    ]}
                  >
                    <Input placeholder="22:00" maxLength={5} />
                  </Form.Item>
                  <Form.Item
                    name="quietTo"
                    label={t('fields.quietTo')}
                    rules={[
                      { pattern: TIME_PATTERN, message: t('errors.time') },
                    ]}
                  >
                    <Input placeholder="07:00" maxLength={5} />
                  </Form.Item>
                </div>
                <Form.Item
                  name="fallbackSmsZalo"
                  valuePropName="checked"
                  className="mb-1"
                >
                  <Switch
                    checkedChildren={t('common.on')}
                    unCheckedChildren={t('common.off')}
                  />
                </Form.Item>
                <span className="text-sm">{t('fields.fallbackSmsZalo')}</span>
                <Alert
                  className="mt-2"
                  type="info"
                  showIcon
                  title={t('fields.fallbackNote')}
                />
              </>
            ),
          },
        ]}
      />
      <Alert
        type="info"
        showIcon
        title={t('mechanism.summaryTitle')}
        description={
          <div aria-live="polite" className="space-y-2">
            <p className="m-0">{threshold}</p>
            <p className="m-0">
              {t('mechanism.summaryWindow', {
                from:
                  values.startsOn?.format('DD/MM/YYYY') ??
                  t('mechanism.afterActivation'),
                to:
                  values.endsOn?.endOf('day').format('DD/MM/YYYY HH:mm') ??
                  t('summary.noEnd'),
              })}
            </p>
            <p className="m-0">
              {t('mechanism.summaryRepeat', {
                days: values.cooldownDays ?? '—',
                max: values.maxSends ?? '—',
              })}
            </p>
            <p className="m-0">
              {t('mechanism.currentCap', { cap: values.frequencyCap ?? '—' })}
            </p>
            <p className="m-0">
              {t('mechanism.summaryQuiet', {
                from: values.quietFrom || '—',
                to: values.quietTo || '—',
              })}
            </p>
            <p className="m-0">
              {t('mechanism.summaryExit', {
                condition:
                  preset === 'warranty_expiring'
                    ? values.exitOnWarrantyRenewed
                      ? t('fields.exitOnWarrantyRenewed')
                      : t('mechanism.noExit')
                    : values.exitOnPurchase
                      ? t('fields.exitOnPurchase')
                      : t('mechanism.noExit'),
              })}
            </p>
          </div>
        }
      />
    </div>
  );
}
