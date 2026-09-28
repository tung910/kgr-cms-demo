import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  applyMemberReasonAction,
  type MemberReasonAction,
} from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import type { Member } from '../schemas/systemSchemas';
import { systemErrorMessage } from '../utils/systemErrors';

export interface MemberReasonTarget {
  member: Member;
  action: MemberReasonAction;
}

export interface MemberReasonModalProps {
  target: MemberReasonTarget | undefined;
  onClose: () => void;
}

// Lock, unlock and delete need a reason: it is stored in the audit log.
export function MemberReasonModal({ target, onClose }: MemberReasonModalProps) {
  const { t } = useTranslation('system');
  const [form] = Form.useForm<{ reason: string; transferToId?: string }>();
  const queryClient = useQueryClient();

  const action = target?.action;
  // Owned Admins must change hands before their System Admin is locked or
  // disabled; a plain transfer always needs a receiver.
  const checksOwned =
    target?.member.level === 'system_admin' &&
    (action === 'lock' || action === 'disable');
  const owned = useQuery({
    ...systemQueries.ownedAdmins(target?.member.id ?? ''),
    enabled: checksOwned,
  });
  const ownedAdmins = owned.data ?? [];
  const needsOwner =
    action === 'transfer' || (checksOwned && ownedAdmins.length > 0);
  const options = useQuery({
    ...systemQueries.memberOptions(),
    enabled: needsOwner,
  });
  const receivers = (options.data?.system_admins ?? []).filter(
    (admin) =>
      admin.id !== target?.member.id &&
      admin.id !== target?.member.ownerSystemAdminId
  );

  const mutation = useMutation({
    mutationFn: (input: { reason: string; transferToId?: string }) =>
      applyMemberReasonAction({
        id: target!.member.id,
        action: target!.action,
        ...input,
      }),
    onSuccess: () => {
      void message.success(t(`members.reasonModal.${target!.action}.success`));
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
      form.resetFields();
      onClose();
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  return (
    <Modal
      title={
        action
          ? t(`members.reasonModal.${action}.title`, {
              name: target.member.fullName,
            })
          : ''
      }
      open={Boolean(target)}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okButtonProps={{
        danger:
          action === 'delete' || action === 'lock' || action === 'disable',
      }}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      destroyOnHidden
    >
      {action === 'delete' ? (
        <Alert
          type="warning"
          className="mb-4"
          message={t('members.reasonModal.delete.warning')}
        />
      ) : null}
      {needsOwner && action !== 'transfer' ? (
        <Alert
          type="warning"
          className="mb-4"
          message={t('members.reasonModal.ownedTitle')}
          description={ownedAdmins.map((admin) => admin.fullName).join(', ')}
        />
      ) : null}
      <Form
        form={form}
        layout="vertical"
        onFinish={({ reason, transferToId }) =>
          mutation.mutate({ reason: reason.trim(), transferToId })
        }
      >
        <Form.Item
          name="reason"
          label={t('members.reasonModal.reason')}
          rules={[{ required: true, whitespace: true }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        {needsOwner ? (
          <Form.Item
            name="transferToId"
            label={t('members.reasonModal.owner')}
            rules={[{ required: true }]}
          >
            <Select
              loading={options.isLoading}
              options={receivers.map((admin) => ({
                value: admin.id,
                label: admin.name,
              }))}
            />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
