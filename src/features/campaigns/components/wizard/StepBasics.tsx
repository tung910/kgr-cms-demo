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
import { useTranslation } from 'react-i18next';

import {
  CAMPAIGN_KINDS,
  DISPLAY_TYPES,
  NOTIFICATION_GROUPS,
  TRIGGER_PRESETS,
} from '../../constants/campaignEnums';
import type { WizardValues } from './wizardValues';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// B0 — one-off or automatic trigger. Decides what B2 asks for.
export function StepType() {
  const { t } = useTranslation('campaigns');
  return (
    <div className="space-y-3">
      <p className="m-0 text-sm text-[#636466]">{t('steps.type.hint')}</p>
      <Form.Item name="kind" noStyle>
        <Radio.Group className="flex w-full flex-col gap-3">
          {CAMPAIGN_KINDS.map(({ value, labelKey }) => (
            <Radio
              key={value}
              value={value}
              className="m-0 w-full rounded-xl border border-[#E7E8E9] p-3"
            >
              <span className="font-medium">{t(labelKey)}</span>
              <span className="block text-xs text-[#636466]">
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
    <>
      <Form.Item
        name="name"
        label={t('fields.name')}
        rules={[{ required: true, whitespace: true }]}
      >
        <Input maxLength={120} placeholder={t('fields.namePlaceholder')} />
      </Form.Item>
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
        label={t('fields.notificationGroup')}
        tooltip={t('fields.notificationGroupHint')}
      >
        <Select
          options={NOTIFICATION_GROUPS.map(({ value, labelKey }) => ({
            value,
            label: t(labelKey),
          }))}
        />
      </Form.Item>
    </>
  );
}

// B2 — when it runs: a send time for one-offs, entry/exit rules for triggers.
export function StepMechanism() {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const kind = Form.useWatch('kind', form);
  const scheduleType = Form.useWatch('scheduleType', form);
  const preset = Form.useWatch('triggerPreset', form);

  if (kind !== 'trigger') {
    return (
      <>
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
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Form.Item name="triggerPreset" label={t('fields.triggerPreset')}>
        <Select
          options={TRIGGER_PRESETS.map(({ value, labelKey }) => ({
            value,
            label: t(labelKey),
          }))}
        />
      </Form.Item>
      <p className="-mt-3 mb-4 text-xs text-[#636466]">
        {preset ? t(`trigger.hint.${preset}`) : null}
      </p>
      {preset === 'core_due' ? (
        <Form.Item
          name="coreDays"
          label={t('fields.coreDays')}
          rules={[{ required: true, type: 'number', min: 1, max: 365 }]}
        >
          <InputNumber
            min={1}
            max={365}
            precision={0}
            addonAfter={t('unit.days')}
          />
        </Form.Item>
      ) : null}
      <fieldset className="mb-4 rounded-lg border border-[#E7E8E9] p-3">
        <legend className="px-1 text-sm font-medium">{t('fields.exit')}</legend>
        <Form.Item
          name="exitOnPurchase"
          valuePropName="checked"
          className="mb-1"
        >
          <Checkbox>{t('fields.exitOnPurchase')}</Checkbox>
        </Form.Item>
        <Form.Item
          name="exitOnWarrantyRenewed"
          valuePropName="checked"
          className="mb-0"
        >
          <Checkbox>{t('fields.exitOnWarrantyRenewed')}</Checkbox>
        </Form.Item>
      </fieldset>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="cooldownDays"
          label={t('fields.cooldownDays')}
          rules={[{ required: true, type: 'number', min: 0, max: 365 }]}
        >
          <InputNumber
            min={0}
            max={365}
            precision={0}
            addonAfter={t('unit.days')}
          />
        </Form.Item>
        <Form.Item
          name="maxSends"
          label={t('fields.maxSends')}
          rules={[{ required: true, type: 'number', min: 1, max: 100 }]}
        >
          <InputNumber min={1} max={100} precision={0} />
        </Form.Item>
        <Form.Item name="startsOn" label={t('fields.startsOn')}>
          <DatePicker format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="endsOn" label={t('fields.endsOn')}>
          <DatePicker format="DD/MM/YYYY" />
        </Form.Item>
      </div>
      <Collapse
        ghost
        items={[
          {
            key: 'advanced',
            label: t('wizard.advanced'),
            forceRender: true,
            children: (
              <>
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
    </>
  );
}
