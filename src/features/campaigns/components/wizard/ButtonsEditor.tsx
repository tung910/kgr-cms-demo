import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Form, Input, Radio, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  BUTTON_TYPES,
  CORE_MODES,
  MAX_BUTTON_LABEL_LENGTH,
  MAX_CAMPAIGN_BUTTONS,
} from '../../constants/campaignCta';
import { APP_DEEPLINK_TARGETS } from '../../constants/deeplinkTargets';
import { campaignQueries } from '../../queries/campaignQueries';
import { suggestButtonLabel } from '../../utils/buttonText';
import type { ButtonValues, WizardValues } from './wizardValues';

// Up to two buttons (spec 7.1/7.3), each configured by type: "Mua lõi" follows
// the customer's own core or targets SKUs picked from the core catalogue.
export function ButtonsEditor() {
  const { t } = useTranslation('campaigns');
  const form = Form.useFormInstance<WizardValues>();
  const buttons: ButtonValues[] = Form.useWatch('buttons', form) ?? [];
  const cores = useQuery(campaignQueries.coreOptions());

  return (
    <Form.Item label={t('fields.buttons')} tooltip={t('fields.buttonsHint')}>
      <Form.List name="buttons">
        {(fields, { add, remove }) => (
          <div className="space-y-3">
            {fields.length === 0 ? (
              <p className="m-0 text-sm text-[#636466]">{t('button.none')}</p>
            ) : null}
            {fields.map((field, index) => {
              const current = buttons[index];
              return (
                <div
                  key={field.key}
                  className="rounded-xl border border-[#E7E8E9] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {index === 0
                        ? t('button.primary')
                        : t('button.secondary')}
                    </span>
                    <Button
                      type="text"
                      aria-label={t('button.remove')}
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item
                      name={[field.name, 'type']}
                      label={t('button.typeLabel')}
                    >
                      <Select
                        options={BUTTON_TYPES.map(({ value, labelKey }) => ({
                          value,
                          label: t(labelKey),
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'label']}
                      label={t('button.label')}
                    >
                      <Input
                        maxLength={MAX_BUTTON_LABEL_LENGTH}
                        showCount
                        placeholder={
                          current
                            ? suggestButtonLabel(current, cores.data ?? [], t)
                            : undefined
                        }
                      />
                    </Form.Item>
                  </div>
                  {current?.type === 'buy_core' ? (
                    <>
                      <Form.Item
                        name={[field.name, 'coreMode']}
                        label={t('button.coreModeLabel')}
                      >
                        <Radio.Group
                          options={CORE_MODES.map(({ value, labelKey }) => ({
                            value,
                            label: t(labelKey),
                          }))}
                        />
                      </Form.Item>
                      {current.coreMode === 'specific' ? (
                        <Form.Item
                          name={[field.name, 'coreSkus']}
                          label={t('button.coreSkus')}
                          rules={[
                            {
                              required: true,
                              type: 'array',
                              min: 1,
                              message: t('errors.coreRequired'),
                            },
                          ]}
                        >
                          <Select
                            mode="multiple"
                            allowClear
                            loading={cores.isFetching}
                            placeholder={t('fields.pickPlaceholder')}
                            options={cores.data?.map((core) => ({
                              value: core.sku,
                              label: `${core.name} (${core.sku})`,
                            }))}
                          />
                        </Form.Item>
                      ) : (
                        <p className="m-0 text-xs text-[#636466]">
                          {t('button.coreModeAutoHint')}
                        </p>
                      )}
                    </>
                  ) : null}
                  {current?.type === 'open_screen' ? (
                    <Form.Item
                      name={[field.name, 'screen']}
                      label={t('button.screen')}
                      rules={[{ required: true }]}
                    >
                      <Select
                        placeholder={t('fields.pickPlaceholder')}
                        options={APP_DEEPLINK_TARGETS.map(
                          ({ value, labelKey }) => ({
                            value,
                            label: t(labelKey),
                          })
                        )}
                      />
                    </Form.Item>
                  ) : null}
                </div>
              );
            })}
            {fields.length < MAX_CAMPAIGN_BUTTONS ? (
              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  add({
                    type: fields.length === 0 ? 'buy_core' : 'book_technician',
                    coreMode: 'auto',
                  })
                }
              >
                {fields.length === 0
                  ? t('button.add')
                  : t('button.addSecondary')}
              </Button>
            ) : null}
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
}
