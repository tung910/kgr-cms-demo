import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, message } from 'antd';
import { useTranslation } from 'react-i18next';

import type { PortalRole } from '@/core/auth/types';

import { createRoleGroup } from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import { systemErrorMessage } from '../utils/systemErrors';

export interface RoleGroupCreateModalProps {
  open: boolean;
  // The System Admin group a new Admin lĩnh vực group sits under.
  parentId?: PortalRole | undefined;
  onClose: () => void;
  onCreated: (id: PortalRole) => void;
}

// A new group starts with read access to the devices page (the smallest
// non-empty matrix — at least one permission is required); edit it afterwards.
export function RoleGroupCreateModal({
  open,
  parentId,
  onClose,
  onCreated,
}: RoleGroupCreateModalProps) {
  const { t } = useTranslation('system');
  const [form] = Form.useForm<{ name: string }>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ name }: { name: string }) =>
      createRoleGroup({
        name: name.trim(),
        // An Admin group needs to manage its users, so it starts with that.
        capabilities: parentId
          ? ['device.read', 'member.read', 'member.create', 'member.update']
          : ['device.read'],
        parentId,
      }),
    onSuccess: (group) => {
      void message.success(t('roles.create.success'));
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
      form.resetFields();
      onCreated(group.id);
      onClose();
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  return (
    <Modal
      title={t(parentId ? 'roles.create.titleAdmin' : 'roles.create.title')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label={t('roles.create.name')}
          rules={[{ required: true, whitespace: true, max: 100 }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
