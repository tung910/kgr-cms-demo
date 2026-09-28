import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, Select, message } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortalRole } from '@/core/auth/types';

import { createMember, updateMember } from '../api/systemApi';
import { systemQueries } from '../queries/systemQueries';
import type { Member, MemberFormValues } from '../schemas/systemSchemas';
import { systemErrorMessage } from '../utils/systemErrors';

export interface MemberFormModalProps {
  open: boolean;
  // Undefined = create a new member.
  member: Member | undefined;
  onClose: () => void;
}

interface FormValues {
  fullName: string;
  phone: string;
  password?: string;
  roleId?: PortalRole;
  assignedRegions: string[];
}

// Login phones are Vietnamese mobile numbers (⚠️ plan Q-43: +84 unconfirmed).
const phonePattern = /^0[35789]\d{8}$/;

export function MemberFormModal({
  open,
  member,
  onClose,
}: MemberFormModalProps) {
  const { t } = useTranslation('system');
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const options = useQuery({ ...systemQueries.memberOptions(), enabled: open });
  const isEdit = member !== undefined;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      member
        ? {
            fullName: member.fullName,
            phone: member.phone,
            password: undefined,
            roleId: member.roleId,
            assignedRegions: member.assignedRegions,
          }
        : { assignedRegions: [] }
    );
  }, [form, member, open]);

  const mutation = useMutation({
    mutationFn: (values: MemberFormValues) =>
      member ? updateMember({ id: member.id, values }) : createMember(values),
    onSuccess: () => {
      void message.success(
        t(isEdit ? 'members.form.updated' : 'members.form.created')
      );
      void queryClient.invalidateQueries({ queryKey: systemQueries.all });
      form.resetFields();
      onClose();
    },
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  // Only the groups meant for the tier being created (or edited).
  const targetLevel = member?.level ?? options.data?.create_level;
  const roleOptions = (options.data?.roles ?? []).filter(
    (role) => role.level === targetLevel
  );
  // Keep the current role selectable even if it is no longer assignable.
  const roleSelectOptions =
    member && !roleOptions.some((role) => role.id === member.roleId)
      ? [
          {
            id: member.roleId,
            name: member.roleName,
            level: member.level,
          },
          ...roleOptions,
        ]
      : roleOptions;

  return (
    <Modal
      title={t(isEdit ? 'members.form.editTitle' : 'members.form.createTitle')}
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
          name="fullName"
          label={t('members.form.fullName')}
          rules={[{ required: true, whitespace: true, min: 2, max: 100 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="phone"
          label={t('members.form.phone')}
          extra={t('members.form.phoneHint')}
          rules={[
            { required: true },
            { pattern: phonePattern, message: t('members.form.phoneInvalid') },
          ]}
        >
          <Input inputMode="tel" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('members.form.password')}
          extra={isEdit ? t('members.form.passwordKeep') : undefined}
          rules={[{ required: !isEdit }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="roleId"
          label={t('members.form.role')}
          rules={[{ required: true }]}
        >
          <Select
            loading={options.isLoading}
            options={roleSelectOptions.map((role) => ({
              value: role.id,
              label: role.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="assignedRegions"
          label={t('members.form.regions')}
          extra={t('members.form.regionsHint')}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder={t('members.form.regionsAll')}
            loading={options.isLoading}
            optionFilterProp="label"
            options={(options.data?.regions ?? []).map((region) => ({
              value: region.code,
              label: region.name,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
