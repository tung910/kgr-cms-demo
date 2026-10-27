import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, InputNumber, Modal, message } from 'antd';
import { Trans, useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';

import { updateCoreType } from '../api/coreLifecycleApi';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import type { CoreType } from '../schemas/coreLifecycleSchemas';
import type { SerialBatch } from '../schemas/serialSchemas';
import { MIN_REASON_LENGTH, lifespanFloor } from '../utils/coreLifespan';
import { ThresholdTags } from './ThresholdTags';

interface CoreTypeFormValues {
  standardMonths: number;
  standardHours: number;
  floorPercent: number;
  reason: string;
}

export interface CoreTypeModalProps {
  core: CoreType | undefined;
  batches: SerialBatch[];
  onClose: () => void;
}

export function CoreTypeModal({ core, batches, onClose }: CoreTypeModalProps) {
  return core ? (
    <CoreTypeDialog
      key={core.code}
      core={core}
      batches={batches}
      onClose={onClose}
    />
  ) : null;
}

function CoreTypeDialog({
  core,
  batches,
  onClose,
}: CoreTypeModalProps & { core: CoreType }) {
  const { t, i18n } = useTranslation('serials');
  const [form] = Form.useForm<CoreTypeFormValues>();
  const queryClient = useQueryClient();
  const ofCore = batches.filter(
    (batch) => batch.coreType === core.code && !batch.recalledAt
  );
  const pending = ofCore.filter(
    (batch) => batch.lifespanStatus === 'pending'
  ).length;
  const confirmed = ofCore.length - pending;
  const months = Form.useWatch('standardMonths', form) ?? core.standardMonths;
  const hours = Form.useWatch('standardHours', form) ?? core.standardHours;
  const floorPercent = Form.useWatch('floorPercent', form) ?? core.floorPercent;
  const number = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage).format(value);

  const mutation = useMutation({
    mutationFn: (values: CoreTypeFormValues) =>
      updateCoreType({
        code: core.code,
        standardMonths: values.standardMonths,
        standardHours: values.standardHours,
        floorPercent: values.floorPercent,
        reason: values.reason.trim(),
      }),
    onSuccess: () => {
      void message.success(t('coreTypeModal.success', { name: core.name }));
      void queryClient.invalidateQueries({
        queryKey: coreLifecycleQueries.all,
      });
      onClose();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('editModal.error'));
    },
  });

  return (
    <Modal
      open
      title={t('coreTypeModal.title', { name: core.name })}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('editModal.save')}
      cancelText={t('editModal.cancel')}
    >
      <Form<CoreTypeFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          standardMonths: core.standardMonths,
          standardHours: core.standardHours,
          floorPercent: core.floorPercent,
        }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Form.Item
            name="standardHours"
            label={t('coreTypeModal.standardHours')}
            rules={[
              { required: true, message: t('coreTypeModal.hoursRange') },
              {
                type: 'integer',
                min: 1,
                max: 20000,
                message: t('coreTypeModal.hoursRange'),
              },
            ]}
          >
            <InputNumber
              min={1}
              max={20000}
              precision={0}
              step={50}
              className="!w-full"
            />
          </Form.Item>
          <Form.Item
            name="standardMonths"
            label={t('coreTypeModal.standardMonths')}
            rules={[
              { required: true, message: t('coreTypeModal.monthsRange') },
              {
                type: 'integer',
                min: 1,
                max: 60,
                message: t('coreTypeModal.monthsRange'),
              },
            ]}
          >
            <InputNumber min={1} max={60} precision={0} className="!w-full" />
          </Form.Item>
        </div>
        {months && hours ? (
          <div className="mb-4 rounded bg-[#F3F4F4] p-3 text-sm">
            <div className="mb-2 text-[#636466]">
              {t('coreTypeModal.thresholdPreview')}
            </div>
            <ThresholdTags lifespan={{ months, hours }} />
          </div>
        ) : null}
        <Form.Item
          name="floorPercent"
          label={t('coreTypeModal.floorPercent')}
          extra={
            <>
              <div>{t('coreTypeModal.floorHint')}</div>
              {months && hours && floorPercent ? (
                <div className="mt-1 font-medium text-[#1F2122]">
                  {t('coreTypeModal.floorExample', {
                    months: lifespanFloor(months, floorPercent),
                    hours: number(lifespanFloor(hours, floorPercent)),
                  })}
                </div>
              ) : null}
            </>
          }
          rules={[
            { required: true, message: t('coreTypeModal.floorRange') },
            {
              type: 'number',
              min: 10,
              max: 100,
              message: t('coreTypeModal.floorRange'),
            },
          ]}
        >
          <InputNumber min={10} max={100} step={5} className="!w-full" />
        </Form.Item>
        <Form.Item
          name="reason"
          label={t('coreTypeModal.reason')}
          rules={[
            {
              validator: (_, value?: string) =>
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
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
      <Alert
        type="info"
        showIcon
        title={
          <Trans
            t={t}
            i18nKey="coreTypeModal.impact"
            values={{ pending, confirmed }}
            components={{ b: <b /> }}
          />
        }
      />
    </Modal>
  );
}
