import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Modal, Table, Upload, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ingestSerialBatch } from '../api/serialApi';
import { serialQueries } from '../queries/serialQueries';
import type { SerialIngestResult } from '../schemas/serialSchemas';

const TEMPLATE_HEADER = 'serial,key';

export interface SerialIngestModalProps {
  open: boolean;
  onClose: () => void;
}

export function SerialIngestModal({ open, onClose }: SerialIngestModalProps) {
  const { t } = useTranslation('serials');
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SerialIngestResult>();

  const mutation = useMutation({
    mutationFn: (file: File) =>
      file
        .text()
        .then((content) => ingestSerialBatch({ fileName: file.name, content })),
    onSuccess: (ingestResult) => {
      setResult(ingestResult);
      void queryClient.invalidateQueries({ queryKey: serialQueries.all });
    },
    onError: () => void message.error(t('ingestModal.error')),
  });

  const close = () => {
    setResult(undefined);
    mutation.reset();
    onClose();
  };

  return (
    <Modal
      title={t('ingestModal.title')}
      open={open}
      onCancel={close}
      onOk={close}
      okText={t('ingestModal.done')}
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <p className="text-sm text-[#636466]">{t('ingestModal.description')}</p>
      <pre className="mb-4 rounded bg-[#F3F4F4] p-3 font-mono text-xs">
        {TEMPLATE_HEADER}
        {'\n'}KGR-A100-7F3K2Q,8d41c0a9
      </pre>
      <Upload.Dragger
        accept=".csv,.txt"
        maxCount={1}
        showUploadList={false}
        disabled={mutation.isPending}
        beforeUpload={(file) => {
          mutation.mutate(file as unknown as File);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('ingestModal.dropHint')}</p>
      </Upload.Dragger>
      {result ? (
        <div className="mt-4 space-y-3">
          <Alert
            type={result.rejected.length > 0 ? 'warning' : 'success'}
            message={t('ingestModal.summary', {
              batchId: result.batchId,
              inserted: result.inserted,
              rejected: result.rejected.length,
            })}
          />
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
      ) : null}
    </Modal>
  );
}
