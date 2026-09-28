import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  DownOutlined,
  ExperimentOutlined,
  LineChartOutlined,
  LockOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SettingOutlined,
  SignalFilled,
  UnlockOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, Form, Input, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';

import { setDeviceLifecycleState } from '../api/deviceApi';
import { requestDiagnostics, sendDeviceCommand } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type { DeviceCommandKind } from '../schemas/deviceDetailSchemas';

interface FormValues {
  reason: string;
}

type LifecycleToggle = 'lock' | 'unlock';
type PendingAction = DeviceCommandKind | LifecycleToggle;

const commandIcons: Record<DeviceCommandKind, ReactNode> = {
  reboot: <ReloadOutlined />,
  ping: <WifiOutlined />,
  flush_membrane: <ExperimentOutlined />,
  power_on: <PoweroffOutlined />,
  power_off: <PoweroffOutlined />,
  set_hot_tank: <ExperimentOutlined />,
};

// Panel tiles use plain glyphs; the tile itself carries the tone.
const panelIcons: Partial<Record<string, ReactNode>> = {
  reboot: <ReloadOutlined />,
  ping: <SignalFilled />,
  flush_membrane: <ExperimentOutlined />,
};

function ActionTile({
  icon,
  label,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-4 rounded-full border border-solid bg-white px-5 py-4 text-left text-base font-medium text-[#020204] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? 'border-[#F8D0D3] hover:bg-[#FEF5F5]'
          : 'border-[#E7E8E9] hover:bg-[#F7F8F8]'
      }`}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full text-lg ${
          danger ? 'bg-[#FBE3E4] text-[#D9131F]' : 'bg-[#E7F4EC] text-[#058642]'
        }`}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

export interface DeviceRemoteActionsProps {
  device: Device;
  /**
   * `header`: the power toggle only.
   * `panel`: the remaining reason-gated commands, shown in Remote Diagnostic.
   */
  placement: 'header' | 'panel';
}

// Entry points for M03 remote operations. Every command is reason-gated and
// lands in the audit trail rendered by DeviceRemoteDiagnosticPanel.
export function DeviceRemoteActions({
  device,
  placement,
}: DeviceRemoteActionsProps) {
  const { t } = useTranslation('devices');
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const canDiagnose = Boolean(
    session && hasCapability(session.role, 'device.diagnose')
  );
  const canControl = Boolean(
    session && hasCapability(session.role, 'device.control')
  );
  const offline = device.status === 'offline';

  const models = useQuery({
    ...modelReferenceQueries.list(),
    enabled: canControl,
  });
  const model = models.data?.find((item) => item.code === device.modelName);

  const diagnose = useMutation({
    mutationFn: () => requestDiagnostics(device.id),
    onSuccess: () => {
      void message.success(t('remoteDiagnostic.quickDiagnoseQueued'));
      void queryClient.invalidateQueries({
        queryKey: deviceQueries.diagnosticsJobs(device.id).queryKey,
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('diagnosticsPanel.error'));
    },
  });

  const closeModal = () => {
    setPending(null);
    form.resetFields();
  };

  const isLifecycleToggle = (value: PendingAction): value is LifecycleToggle =>
    value === 'lock' || value === 'unlock';

  const action = useMutation({
    mutationFn: async (values: FormValues): Promise<void> => {
      if (!pending) throw new Error(t('controlPanel.error'));
      if (isLifecycleToggle(pending)) {
        await setDeviceLifecycleState(device, {
          lifecycleState: pending === 'lock' ? 'locked' : 'active',
          reason: values.reason,
        });
        return;
      }
      await sendDeviceCommand(device.id, pending, values.reason);
    },
    onSuccess: () => {
      void message.success(
        pending && isLifecycleToggle(pending)
          ? t('lifecycleActions.success')
          : t('controlPanel.success')
      );
      closeModal();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(
        description ||
          t(
            pending && isLifecycleToggle(pending)
              ? 'lifecycleActions.error'
              : 'controlPanel.error'
          )
      );
    },
    // A rejected command is still audited server-side, so refresh either way.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
    },
  });

  const header = placement === 'header';
  const commands: DeviceCommandKind[] = !canControl
    ? []
    : header
      ? [device.powered ? 'power_off' : 'power_on']
      : [
          ...(model?.features.supportsMembraneFlush
            ? (['flush_membrane'] as const)
            : []),
          'reboot',
          'ping',
        ];

  const actionItems = commands.map((command) => ({
    key: command,
    icon: <span className="text-[#2F7EDE]">{commandIcons[command]}</span>,
    label: t('controlPanel.commands.' + command),
    danger: command === 'power_off',
    disabled: offline && command !== 'ping',
  }));

  // §3.4c: lock/unlock lives in the same header "Actions" menu as the other
  // control commands rather than its own button.
  const lifecycleToggle: LifecycleToggle | null =
    header && canControl && device.lifecycleState === 'active'
      ? 'lock'
      : header && canControl && device.lifecycleState === 'locked'
        ? 'unlock'
        : null;
  const lifecycleItem = lifecycleToggle
    ? [
        {
          key: lifecycleToggle,
          icon: (
            <span className="text-[#2F7EDE]">
              {lifecycleToggle === 'lock' ? (
                <LockOutlined />
              ) : (
                <UnlockOutlined />
              )}
            </span>
          ),
          label: t('lifecycleActions.' + lifecycleToggle),
          danger: false,
          disabled: false,
        },
      ]
    : [];

  if (
    (header || !canDiagnose) &&
    actionItems.length + lifecycleItem.length === 0
  )
    return null;

  const openAction = (command: PendingAction) => setPending(command);
  const menuItems: NonNullable<MenuProps['items']> = [
    ...lifecycleItem,
    ...actionItems,
  ];
  const onMenuClick: MenuProps['onClick'] = ({ key }) =>
    openAction(key as PendingAction);

  const modalTitle = !pending
    ? ''
    : isLifecycleToggle(pending)
      ? t(
          'lifecycleActions.confirmTitle.' +
            (pending === 'lock' ? 'locked' : 'active')
        )
      : t('controlPanel.confirmTitle', {
          command: t('controlPanel.commands.' + pending),
        });
  const dangerous = pending === 'reboot' || pending === 'power_off';

  return (
    <>
      {!header ? (
        <div className="grid gap-4 md:grid-cols-2">
          {canDiagnose ? (
            <ActionTile
              icon={<LineChartOutlined />}
              label={t('remoteDiagnostic.readStatus')}
              disabled={offline || diagnose.isPending}
              onClick={() => diagnose.mutate()}
            />
          ) : null}
          {actionItems.map((item) => (
            <ActionTile
              key={item.key}
              icon={panelIcons[item.key] ?? item.icon}
              label={item.label}
              danger={item.key === 'reboot'}
              disabled={item.disabled}
              onClick={() => openAction(item.key)}
            />
          ))}
        </div>
      ) : menuItems.length > 0 ? (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{ items: menuItems, onClick: onMenuClick }}
        >
          <Button size="large" icon={<SettingOutlined />}>
            {t('remoteDiagnostic.controlMenu')} <DownOutlined />
          </Button>
        </Dropdown>
      ) : null}

      <Modal
        title={modalTitle}
        open={pending !== null}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={action.isPending}
        okText={t(
          pending && isLifecycleToggle(pending)
            ? 'lifecycleActions.confirm'
            : 'controlPanel.confirm'
        )}
        cancelText={t(
          pending && isLifecycleToggle(pending)
            ? 'lifecycleActions.cancel'
            : 'controlPanel.cancel'
        )}
        okButtonProps={{ danger: dangerous }}
        destroyOnHidden
      >
        {pending && !isLifecycleToggle(pending) ? (
          <p className="mt-0 text-sm text-[#636466]">
            {t('controlPanel.description')}
          </p>
        ) : null}
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => action.mutate(values)}
        >
          <Form.Item
            name="reason"
            label={t('controlPanel.reason')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('validation.required'),
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder={t('controlPanel.reasonHint')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
