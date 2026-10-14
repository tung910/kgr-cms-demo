import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import type { PortalRole } from '@/core/auth/types';
import type { Capability } from '@/core/permissions/capabilities';

import type { RoleGroup } from '../schemas/systemSchemas';

import { createRoleGroup } from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import { systemErrorMessage } from '../utils/systemErrors';

export interface RoleGroupCreateModalProps {
  open: boolean;
  templates: RoleGroup[];
  // The System Admin group a new Admin lĩnh vực group sits under.
  parentId?: PortalRole | undefined;
  parentCapabilities?: readonly Capability[] | undefined;
  onClose: () => void;
  onCreated: (id: PortalRole) => void;
}

// Start with a non-empty subset of the parent; choose further rules in the editor.
export function RoleGroupCreateModal({
  open,
  templates,
  parentId,
  parentCapabilities,
  onClose,
  onCreated,
}: RoleGroupCreateModalProps) {
  const { t } = useTranslation('system');
  const [form] = Form.useForm<{ name: string; templateId?: PortalRole }>();
  const queryClient = useQueryClient();

  const defaults: Capability[] = parentId
    ? ['device.read', 'member.read', 'member.create', 'member.update']
    : ['device.read'];
  const permitted = parentCapabilities
    ? defaults.filter((capability) => parentCapabilities.includes(capability))
    : defaults;
  const initialCapabilities =
    permitted.length > 0 ? permitted : (parentCapabilities?.slice(0, 1) ?? []);

  const mutation = useMutation({
    mutationFn: ({
      name,
      templateId,
    }: {
      name: string;
      templateId?: PortalRole;
    }) =>
      createRoleGroup({
        name: name.trim(),
        capabilities: parentId
          ? initialCapabilities
          : (templates.find((group) => group.id === templateId)?.capabilities ??
            initialCapabilities),
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
        initialValues={{ templateId: templates[0]?.id }}
        onFinish={(values) => mutation.mutate(values)}
      >
        {!parentId ? (
          <Form.Item
            name="templateId"
            label={t('roles.create.template')}
            rules={[{ required: true }]}
          >
            <Select
              options={templates.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
            />
          </Form.Item>
        ) : null}
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
