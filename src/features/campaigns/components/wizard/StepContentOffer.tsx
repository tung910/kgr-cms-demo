import {
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
  Tag,
} from 'antd';
import { useTranslation } from 'react-i18next';

import { PERSONALIZATION_VARIABLES } from '../../constants/campaignCta';
import { ButtonsEditor } from './ButtonsEditor';
import { buttonCoreSkus, type WizardValues } from './wizardValues';

// B4 — what the customer sees, plus the button that opens the right app screen.
export function StepContent() {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const abEnabled = Form.useWatch('abEnabled', form);

  const insertVariable = (token: string) => {
    const current = form.getFieldValue('content') ?? '';
    form.setFieldValue('content', `${current}${token}`);
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item
          name="title"
          label={t('fields.title')}
          rules={[{ required: true, whitespace: true }]}
        >
          <Input
            maxLength={80}
            showCount
            placeholder={t('fields.titlePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="content"
          label={t('fields.content')}
          rules={[{ required: true, whitespace: true }]}
          extra={
            <span className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-xs">{t('fields.variables')}</span>
              {PERSONALIZATION_VARIABLES.map(({ token }) => (
                <Tag
                  key={token}
                  className="m-0 cursor-pointer"
                  onClick={() => insertVariable(token)}
                >
                  {token}
                </Tag>
              ))}
            </span>
          }
        >
          <Input.TextArea
            rows={4}
            maxLength={400}
            showCount
            placeholder={t('fields.contentPlaceholder')}
          />
        </Form.Item>
      </section>
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <ButtonsEditor />
      </section>
      <Collapse
        items={[
          {
            key: 'advanced',
            label: t('wizard.advanced'),
            forceRender: true,
            children: (
              <>
                <Form.Item
                  name="abEnabled"
                  valuePropName="checked"
                  label={t('fields.abTest')}
                  tooltip={t('fields.abTestHint')}
                >
                  <Switch />
                </Form.Item>
                {abEnabled ? (
                  <>
                    <Form.Item
                      name="titleB"
                      label={t('fields.titleB')}
                      rules={[{ required: true, whitespace: true }]}
                    >
                      <Input maxLength={80} />
                    </Form.Item>
                    <Form.Item
                      name="bodyB"
                      label={t('fields.bodyB')}
                      rules={[{ required: true, whitespace: true }]}
                    >
                      <Input.TextArea rows={3} maxLength={400} />
                    </Form.Item>
                    <Form.Item name="splitB" label={t('fields.splitB')}>
                      <Slider min={1} max={99} />
                    </Form.Item>
                  </>
                ) : null}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

// B5 — optional voucher / loyalty points attached to the campaign.
export function StepOffer() {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const enabled = Form.useWatch('offerEnabled', form);
  const kind = Form.useWatch('offerKind', form);
  const values = Form.useWatch([], form) ?? {};

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-[#E7E8E9] p-4">
        <Form.Item
          name="offerEnabled"
          valuePropName="checked"
          label={t('fields.offerEnabled')}
          className="mb-0"
        >
          <Switch />
        </Form.Item>
      </section>
      {enabled ? (
        <>
          <section className="rounded-xl border border-[#E7E8E9] p-4">
            <Form.Item name="offerKind" label={t('fields.offerKind')}>
              <Select
                className="w-full"
                options={[
                  {
                    value: 'voucher_percent',
                    label: t('offer.kind.voucher_percent'),
                  },
                  {
                    value: 'voucher_amount',
                    label: t('offer.kind.voucher_amount'),
                  },
                  { value: 'points', label: t('offer.kind.points') },
                ]}
              />
            </Form.Item>
            {kind === 'points' ? (
              <Form.Item
                name="points"
                label={t('fields.points')}
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={0}
                  addonAfter={t('unit.points')}
                />
              </Form.Item>
            ) : (
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="voucherCode"
                  label={t('fields.voucherCode')}
                  rules={[{ required: true, whitespace: true }]}
                >
                  <Input maxLength={30} placeholder="LOI10" />
                </Form.Item>
                <Form.Item
                  name="discountValue"
                  label={t('fields.discountValue')}
                  rules={[
                    {
                      required: true,
                      type: 'number',
                      min: 1,
                      max: kind === 'voucher_percent' ? 100 : undefined,
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={kind === 'voucher_percent' ? 100 : undefined}
                    precision={0}
                    addonAfter={
                      kind === 'voucher_percent' ? '%' : t('unit.vnd')
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="usageLimitTotal"
                  label={t('fields.usageLimit')}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    precision={0}
                  />
                </Form.Item>
              </div>
            )}
            <Form.Item name="validUntil" label={t('fields.validUntil')}>
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
                  <Form.Item
                    name="appliesTo"
                    label={t('fields.appliesTo')}
                    tooltip={t('fields.appliesToHint')}
                    className="mb-0"
                  >
                    <Input
                      maxLength={40}
                      placeholder={
                        buttonCoreSkus(values).join(', ') || 'ER00051 / CORE-PP'
                      }
                    />
                  </Form.Item>
                ),
              },
            ]}
          />
        </>
      ) : (
        <p className="m-0 rounded-xl border border-dashed border-[#D5D7D8] bg-[#F7F8F8] p-4 text-sm text-[#636466]">
          {t('wizard.noOffer')}
        </p>
      )}
    </div>
  );
}
