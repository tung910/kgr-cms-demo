import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, Modal, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { StatusTag } from '@/shared/components/StatusTag';
import { formatDateTimeInLocale } from '@/shared/lib/format';

import { createBackup, restoreBackup } from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import type { Backup } from '../schemas/systemSchemas';
import { systemErrorMessage } from '../utils/systemErrors';

export interface BackupPanelProps {
  backups: Backup[];
}

export function BackupPanel({ backups }: BackupPanelProps) {
  const { t, i18n } = useTranslation('system');
  const queryClient = useQueryClient();
  const [restoreTarget, setRestoreTarget] = useState<Backup>();
  const [confirmCode, setConfirmCode] = useState('');

  const createMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      void message.success(t('backup.created'));
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: () => {
      void message.success(t('backup.restored'));
      closeRestore();
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  function closeRestore() {
    setRestoreTarget(undefined);
    setConfirmCode('');
  }

  const columns: ColumnsType<Backup> = [
    {
      title: t('backup.columns.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    {
      title: t('backup.columns.kind'),
      dataIndex: 'kind',
      key: 'kind',
      render: (kind: Backup['kind']) => (
        <StatusTag
          status={kind === 'manual' ? 'pending' : 'inactive'}
          label={t(`backup.kind.${kind}`)}
        />
      ),
    },
    {
      title: t('backup.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDateTimeInLocale(value, i18n.language),
    },
    {
      title: t('backup.columns.size'),
      dataIndex: 'sizeMb',
      key: 'sizeMb',
      render: (value: number) => `${value} MB`,
    },
    {
      title: t('backup.columns.createdBy'),
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (value: string | null) => value ?? t('backup.system'),
    },
    {
      title: t('backup.columns.actions'),
      key: 'actions',
      render: (_: unknown, backup) => (
        <PermissionGuard capability="backup.run">
          <Button size="small" danger onClick={() => setRestoreTarget(backup)}>
            {t('backup.restore')}
          </Button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-[#636466]">{t('backup.hint')}</p>
        <PermissionGuard capability="backup.run">
          <Button
            type="primary"
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {t('backup.create')}
          </Button>
        </PermissionGuard>
      </div>
      <Table<Backup>
        rowKey="id"
        columns={columns}
        dataSource={backups}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
      <Modal
        title={t('backup.restoreModal.title', { code: restoreTarget?.code })}
        open={Boolean(restoreTarget)}
        onCancel={closeRestore}
        onOk={() =>
          restoreTarget &&
          restoreMutation.mutate({ id: restoreTarget.id, confirmCode })
        }
        okButtonProps={{
          danger: true,
          disabled: confirmCode !== restoreTarget?.code,
        }}
        confirmLoading={restoreMutation.isPending}
        okText={t('backup.restoreModal.confirm')}
        cancelText={t('common.cancel')}
      >
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={t('backup.restoreModal.warning')}
        />
        <label className="mb-1 block text-sm">
          {t('backup.restoreModal.typeCode', { code: restoreTarget?.code })}
        </label>
        <Input
          value={confirmCode}
          onChange={(event) => setConfirmCode(event.target.value)}
        />
      </Modal>
    </div>
  );
}
