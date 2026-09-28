import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';

import { changeDeviceOwner } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';

export interface DeviceOwnerChangeDialogProps {
  device: Device;
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  customerId: string;
  reason: string;
}

const SEARCH_DEBOUNCE_MS = 300;

// §3.4b: transfer to an existing customer only — never a free-text owner.
export function DeviceOwnerChangeDialog({
  device,
  open,
  onClose,
}: DeviceOwnerChangeDialogProps) {
  const { t } = useTranslation('devices');
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const candidates = useQuery(deviceQueries.ownerCandidates(device.id, search));

  const close = () => {
    setInput('');
    setSearch('');
    onClose();
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      changeDeviceOwner(device.id, values.customerId, values.reason.trim()),
    onSuccess: (result) => {
      void message.success(
        t(
          result.previousOwnerNotified
            ? 'ownership.changeSuccessNotified'
            : 'ownership.changeSuccess'
        )
      );
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
      close();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('ownership.error'));
    },
  });

  return (
    <Modal
      title={t('ownership.changeTitle')}
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('ownership.changeConfirm')}
      cancelText={t('ownership.cancel')}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        message={t('ownership.changeWarning')}
        className="mb-4"
      />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="customerId"
          label={t('ownership.newOwner')}
          rules={[{ required: true, message: t('validation.required') }]}
        >
          <Select
            showSearch
            filterOption={false}
            onSearch={setInput}
            placeholder={t('ownership.newOwnerHint')}
            loading={candidates.isFetching}
            notFoundContent={
              input.trim().length < 2
                ? t('ownership.searchMin')
                : candidates.isError
                  ? t('ownership.searchError')
                  : t('ownership.noCandidates')
            }
            options={(candidates.data ?? []).map((candidate) => ({
              value: candidate.id,
              label: `${candidate.name} · ${candidate.phone} · ${candidate.id}`,
              disabled: candidate.id === device.owner?.id,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="reason"
          label={t('ownership.reason')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('validation.required'),
            },
          ]}
        >
          <Input.TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
