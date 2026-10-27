import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Tag,
  message,
} from 'antd';
import { Trans, useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { DISTRIBUTION_REGION_LABEL_KEYS } from '@/shared/constants/distributionRegion';

import { updateBatchLifespan } from '../api/serialApi';
import { serialQueries } from '../queries/serialQueries';
import type { CoreType, RegionInsight } from '../schemas/coreLifecycleSchemas';
import type { SerialBatch } from '../schemas/serialSchemas';
import {
  MIN_REASON_LENGTH,
  batchLifespanBounds,
  batchLifespanNeedsReason,
  effectiveBatchLifespan,
  lifespanPercent,
} from '../utils/coreLifespan';
import { LifespanText } from './LifespanText';
import { ThresholdTags } from './ThresholdTags';

interface LifespanFormValues {
  months: number;
  hours: number;
  reason?: string;
}

// Early-replacement shares that read as "standard too long" / "standard fits".
const EARLY_REPLACE_HIGH = 25;
const EARLY_REPLACE_LOW = 12;

export interface BatchLifespanModalProps {
  batch: SerialBatch | undefined;
  batches: SerialBatch[];
  coreTypes: CoreType[];
  regionInsights: RegionInsight[];
  onClose: () => void;
}

export function BatchLifespanModal({
  batch,
  ...rest
}: BatchLifespanModalProps) {
  const core = rest.coreTypes.find((item) => item.code === batch?.coreType);
  // Mounted per batch so the form starts from that batch's values.
  return batch && core ? (
    <BatchLifespanDialog key={batch.id} batch={batch} core={core} {...rest} />
  ) : null;
}

function BatchLifespanDialog({
  batch,
  core,
  batches,
  regionInsights,
  onClose,
}: Omit<BatchLifespanModalProps, 'batch' | 'coreTypes'> & {
  batch: SerialBatch;
  core: CoreType;
}) {
  const { t, i18n } = useTranslation('serials');
  const [form] = Form.useForm<LifespanFormValues>();
  const queryClient = useQueryClient();
  const bounds = batchLifespanBounds(core);
  const current = effectiveBatchLifespan(batch, core);
  const isPending = batch.lifespanStatus === 'pending';
  const months = Form.useWatch('months', form) ?? current.months;
  const hours = Form.useWatch('hours', form) ?? current.hours;
  const reasonRequired = batchLifespanNeedsReason(
    core,
    batch.lifespanStatus,
    months,
    hours
  );
  const percent = lifespanPercent(hours, core.standardHours);
  const insight = regionInsights.find((item) => item.region === batch.region);
  const regionLabel = batch.region
    ? t(DISTRIBUTION_REGION_LABEL_KEYS[batch.region], { ns: 'common' })
    : '';
  const previous = batches.filter(
    (item) =>
      item.id !== batch.id &&
      item.coreType === batch.coreType &&
      item.region === batch.region &&
      item.lifespanStatus === 'confirmed' &&
      item.lifespanMonths !== null &&
      item.lifespanHours !== null
  );
  const remaining = batch.total - batch.used;
  const number = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage).format(value);

  const mutation = useMutation({
    mutationFn: (values: LifespanFormValues) =>
      updateBatchLifespan({
        batchId: batch.id,
        months: values.months,
        hours: values.hours,
        reason: values.reason?.trim() ?? '',
      }),
    onSuccess: () => {
      void message.success(t('lifespanModal.success', { batchId: batch.id }));
      void queryClient.invalidateQueries({ queryKey: serialQueries.all });
      onClose();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('editModal.error'));
    },
  });

  const hint = !insight
    ? null
    : insight.earlyReplacePercent >= EARLY_REPLACE_HIGH
      ? t('lifespanModal.hintHigh')
      : insight.earlyReplacePercent <= EARLY_REPLACE_LOW
        ? t('lifespanModal.hintLow')
        : t('lifespanModal.hintNormal');

  return (
    <Modal
      open
      title={t(
        isPending ? 'lifespanModal.titleConfirm' : 'lifespanModal.titleAdjust',
        { batchId: batch.id }
      )}
      width={920}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={
        isPending ? t('lifespanModal.confirmOk') : t('lifespanModal.adjustOk')
      }
      cancelText={t('editModal.cancel')}
    >
      <Form<LifespanFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          months: current.months,
          hours: current.hours,
        }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Descriptions
              size="small"
              column={1}
              className="mb-4"
              items={[
                {
                  key: 'core',
                  label: t('lifespanModal.coreType'),
                  children: core.name,
                },
                {
                  key: 'standard',
                  label: t('lifespanModal.standard'),
                  children: (
                    <LifespanText
                      months={core.standardMonths}
                      hours={core.standardHours}
                    />
                  ),
                },
                {
                  key: 'thresholds',
                  label: t('lifespanModal.thresholds'),
                  children: <ThresholdTags lifespan={{ months, hours }} />,
                },
                {
                  key: 'region',
                  label: t('lifespanModal.region'),
                  children: regionLabel,
                },
                {
                  key: 'floor',
                  label: t('lifespanModal.floor'),
                  children: t('lifespanModal.floorValue', {
                    percent: core.floorPercent,
                    months: bounds.minMonths,
                    hours: number(bounds.minHours),
                  }),
                },
              ]}
            />
            <Form.Item
              name="months"
              label={t('lifespanModal.months')}
              rules={[
                { required: true, message: t('lifespanModal.monthsRequired') },
                {
                  type: 'integer',
                  min: bounds.minMonths,
                  max: bounds.maxMonths,
                  message: t('lifespanModal.monthsRange', {
                    min: bounds.minMonths,
                    max: bounds.maxMonths,
                    floor: core.floorPercent,
                    name: core.name,
                  }),
                },
              ]}
            >
              <InputNumber
                min={bounds.minMonths}
                max={bounds.maxMonths}
                precision={0}
                className="!w-full"
              />
            </Form.Item>
            <Form.Item
              name="hours"
              label={t('lifespanModal.hours')}
              extra={t('lifespanModal.hoursHint')}
              rules={[
                { required: true, message: t('lifespanModal.hoursRequired') },
                {
                  type: 'integer',
                  min: bounds.minHours,
                  max: bounds.maxHours,
                  message: t('lifespanModal.hoursRange', {
                    min: number(bounds.minHours),
                    max: number(bounds.maxHours),
                    floor: core.floorPercent,
                    name: core.name,
                  }),
                },
              ]}
            >
              <InputNumber
                min={bounds.minHours}
                max={bounds.maxHours}
                precision={0}
                step={10}
                className="!w-full"
              />
            </Form.Item>
            {months ? (
              <p className="mb-4 mt-0 text-sm">
                {t('lifespanModal.ratio', { percent })}{' '}
                {percent < 100 ? (
                  <Tag color="orange">{t('lifespanModal.adjusted')}</Tag>
                ) : null}
              </p>
            ) : null}
            <Form.Item
              name="reason"
              label={
                reasonRequired
                  ? t('lifespanModal.reasonRequiredLabel')
                  : t('lifespanModal.reasonOptionalLabel')
              }
              dependencies={['months', 'hours']}
              rules={[
                {
                  validator: (_, value?: string) =>
                    !reasonRequired ||
                    (value?.trim().length ?? 0) >= MIN_REASON_LENGTH
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            t('lifespanModal.reasonMin', {
                              count: MIN_REASON_LENGTH,
                            })
                          )
                        ),
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t('lifespanModal.reasonPlaceholder')}
              />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              title={
                batch.used > 0 ? (
                  <Trans
                    t={t}
                    i18nKey="lifespanModal.noRetroactive"
                    values={{
                      used: number(batch.used),
                      total: number(batch.total),
                      remaining: number(remaining),
                    }}
                    components={{ b: <b /> }}
                  />
                ) : (
                  <Trans
                    t={t}
                    i18nKey="lifespanModal.noneActivated"
                    values={{ total: number(batch.total) }}
                    components={{ b: <b /> }}
                  />
                )
              }
            />
          </div>
          <aside className="rounded-lg bg-[#F3F4F4] p-4">
            <h4 className="mb-3 mt-0 text-sm font-semibold">
              {t('lifespanModal.referenceTitle', { region: regionLabel })}
            </h4>
            {insight ? (
              <>
                <div className="flex justify-between gap-3 border-b border-[#E7E8E9] py-1.5 text-sm">
                  <span>{t('lifespanModal.avgTds')}</span>
                  <b>{t('lifespanModal.ppm', { value: insight.avgTdsPpm })}</b>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#E7E8E9] py-1.5 text-sm">
                  <span>{t('lifespanModal.earlyReplace')}</span>
                  <b>≈ {insight.earlyReplacePercent}%</b>
                </div>
                <p className="mb-0 mt-2 text-sm text-[#636466]">{hint}</p>
              </>
            ) : (
              <p className="m-0 text-sm text-[#636466]">
                {t('lifespanModal.noInsight')}
              </p>
            )}
            <h5 className="mb-1 mt-4 text-xs font-semibold text-[#636466]">
              {t('lifespanModal.previousBatches')}
            </h5>
            {previous.length > 0 ? (
              <ul className="my-1 pl-4 text-sm">
                {previous.map((item) => (
                  <li key={item.id}>
                    {item.id}:{' '}
                    <b>
                      <LifespanText
                        months={item.lifespanMonths!}
                        hours={item.lifespanHours!}
                      />
                    </b>{' '}
                    <span className="text-[#636466]">
                      {t('lifespanModal.ofStandard', {
                        percent: lifespanPercent(
                          item.lifespanHours!,
                          core.standardHours
                        ),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-[#636466]">
                {t('lifespanModal.noPreviousBatches')}
              </p>
            )}
            <p className="mb-0 mt-3 text-xs text-[#636466]">
              {t('lifespanModal.referenceSource')}
            </p>
          </aside>
        </div>
      </Form>
    </Modal>
  );
}
