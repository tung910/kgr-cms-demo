import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Form, Modal, Select, Table, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import type { DistributionRegion } from '@/shared/constants/distributionRegion';

import { ingestSerialBatch } from '../api/serialApi';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import { serialQueries } from '../queries/serialQueries';
import type { SerialIngestResult } from '../schemas/serialSchemas';
import { regionSelectOptions } from './regionOptions';

const TEMPLATE_HEADER = 'serial,key';

interface IngestFormValues {
  coreType: string;
  region?: DistributionRegion;
}

export interface SerialIngestModalProps {
  open: boolean;
  onClose: () => void;
}

export function SerialIngestModal({ open, onClose }: SerialIngestModalProps) {
  const { t } = useTranslation('serials');
  const [form] = Form.useForm<IngestFormValues>();
  const queryClient = useQueryClient();
  const config = useQuery({ ...coreLifecycleQueries.detail(), enabled: open });
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState(false);
  const [result, setResult] = useState<SerialIngestResult>();

  const mutation = useMutation({
    mutationFn: async (values: IngestFormValues) =>
      ingestSerialBatch({
        coreType: values.coreType,
        ...(values.region && { region: values.region }),
        fileName: file!.name,
        content: await file!.text(),
      }),
    onSuccess: (ingestResult) => {
      setResult(ingestResult);
      void queryClient.invalidateQueries({ queryKey: serialQueries.all });
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('ingestModal.error'));
    },
  });

  const close = () => {
    setResult(undefined);
    setFile(undefined);
    setFileError(false);
    form.resetFields();
    mutation.reset();
    onClose();
  };

  const fileList: UploadFile[] = file
    ? [{ uid: 'ingest-file', name: file.name, status: 'done' }]
    : [];

  return (
    <Modal
      title={t('ingestModal.title')}
      open={open}
      onCancel={close}
      onOk={result ? close : () => form.submit()}
      okText={result ? t('ingestModal.done') : t('ingestModal.submit')}
      cancelText={t('editModal.cancel')}
      cancelButtonProps={result ? { style: { display: 'none' } } : undefined}
      confirmLoading={mutation.isPending}
      destroyOnHidden
    >
      {result ? (
        <div className="space-y-3">
          <Alert
            type={result.rejected.length > 0 ? 'warning' : 'success'}
            title={t('ingestModal.summary', {
              batchId: result.batchId,
              inserted: result.inserted,
              rejected: result.rejected.length,
            })}
          />
          {result.inserted > 0 ? (
            <Alert type="info" title={t('ingestModal.pendingNote')} />
          ) : null}
          {result.rejected.length > 0 ? (
            <Table
              rowKey="line"
              size="small"
              pagination={false}
              scroll={{ y: 220 }}
              dataSource={result.rejected}
              columns={[
                {
                  title: t('ingestModal.columns.line'),
                  dataIndex: 'line',
                  key: 'line',
                },
                {
                  title: t('ingestModal.columns.serial'),
                  dataIndex: 'serial',
                  key: 'serial',
                },
                {
                  title: t('ingestModal.columns.reason'),
                  key: 'reason',
                  render: (_, row) => t(`ingestModal.reasons.${row.reason}`),
                },
              ]}
            />
          ) : null}
        </div>
      ) : (
        <Form<IngestFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!file) {
              setFileError(true);
              return;
            }
            mutation.mutate(values);
          }}
        >
          <Form.Item
            name="coreType"
            label={t('ingestModal.coreType')}
            rules={[
              { required: true, message: t('ingestModal.coreTypeRequired') },
            ]}
          >
            <Select
              loading={config.isFetching}
              options={config.data?.coreTypes.map((core) => ({
                value: core.code,
                label: core.name,
              }))}
            />
          </Form.Item>
          <PermissionGuard
            capability="serial.batch.region"
            fallback={
              <p className="mb-4 mt-0 text-sm text-[#636466]">
                {t('ingestModal.regionLater')}
              </p>
            }
          >
            <Form.Item
              name="region"
              label={t('ingestModal.region')}
              extra={t('ingestModal.regionHint')}
            >
              <Select allowClear options={regionSelectOptions(t)} />
            </Form.Item>
          </PermissionGuard>
          <p className="mb-2 mt-0 text-sm text-[#636466]">
            {t('ingestModal.description')}
          </p>
          <pre className="mb-3 rounded bg-[#F3F4F4] p-3 font-mono text-xs">
            {TEMPLATE_HEADER}
            {'\n'}KGR-0108-7F3K2Q,8d41c0a9
          </pre>
          <Upload.Dragger
            accept=".csv,.txt"
            maxCount={1}
            fileList={fileList}
            disabled={mutation.isPending}
            onRemove={() => setFile(undefined)}
            beforeUpload={(selected) => {
              setFile(selected as unknown as File);
              setFileError(false);
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('ingestModal.dropHint')}</p>
          </Upload.Dragger>
          {fileError ? (
            <div className="mt-1 text-sm text-[#D9131F]" role="alert">
              {t('ingestModal.fileRequired')}
            </div>
          ) : null}
          <Alert
            className="mt-4"
            type="info"
            showIcon
            title={t('ingestModal.lifespanNote')}
          />
          <p className="mb-0 mt-3 text-sm text-[#636466]">
            {t('ingestModal.batchIdAuto')}
          </p>
        </Form>
      )}
    </Modal>
  );
}
