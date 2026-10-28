import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Radio, Tag, message } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { PortalCard, PortalProgress } from '@/shared/components/portal';
import { randomId } from '@/shared/lib/id';

import { createServiceTicketFromCoreAlert } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type { CoreAlert } from '../schemas/deviceDetailSchemas';
import type { Entitlement } from '../schemas/entitlementSchemas';

interface FormValues {
  reason: string;
  entitlementId: string | null;
}

// §6.3 "Dùng gói dịch vụ": only a BT-FIL/BT-COR entitlement delivered by a
// technician, currently active/expiring, with an open slot
// (`quota - used - reserved > 0`) is offered here. This is client-side
// display filtering only — the server re-checks the same constraint (§6.2)
// against live data regardless of what this list shows.
function eligibleEntitlements(
  entitlements: Entitlement[] | undefined
): Entitlement[] {
  if (!entitlements) return [];
  return entitlements.filter((entitlement) => {
    const snapshot = entitlement.packageSnapshot;
    const isEligibleType =
      snapshot.serviceTypeCode === 'BT-FIL' ||
      snapshot.serviceTypeCode === 'BT-COR';
    const isEligibleStatus =
      entitlement.status === 'active' || entitlement.status === 'expiring';
    const hasOpenSlot =
      entitlement.quota !== null &&
      entitlement.used + entitlement.reserved < entitlement.quota;
    return (
      isEligibleType &&
      snapshot.delivery === 'technician' &&
      isEligibleStatus &&
      hasOpenSlot
    );
  });
}

// M03.1 — surfaced only when a core has crossed its M04.1 threshold; the
// CTA reuses the existing service-ticket flow instead of a parallel one.
export function DeviceCoreAlertsPanel({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [pending, setPending] = useState<CoreAlert | null>(null);

  const alerts = useQuery(deviceQueries.coreAlerts(device.id));
  const entitlements = useQuery(deviceQueries.entitlements(device.id));
  const eligible = eligibleEntitlements(entitlements.data);

  // Double-click / double-Enter guard (same lesson learned fixing
  // ServicePackageAutoAttachDialog): antd's OK button only disables once
  // `confirmLoading` (= `mutation.isPending`) flips true, and that only
  // happens *after* this handler returns and async field validation has
  // already run once. Without a synchronous guard here, a second click
  // landing in that window calls `form.submit()` again and reaches
  // `mutate()` a second time with its own fresh Idempotency-Key, defeating
  // the point of idempotency protection on the endpoint.
  const submitting = useRef(false);
  const wasPending = useRef(false);

  // One key per "create ticket for this alert" attempt (spec §11): minted the
  // moment the modal opens for a given alert (see `setPending` below), and
  // reused across a validation-failure resubmit and a genuine network retry.
  // Opening the modal for a *different* alert mints a fresh key.
  const ticketKeyRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!pending) throw new Error(t('coreAlerts.error'));
      return createServiceTicketFromCoreAlert(
        device.id,
        pending.position,
        values.reason,
        values.entitlementId ?? null,
        ticketKeyRef.current ?? randomId()
      );
    },
    onSuccess: () => {
      void message.success(t('coreAlerts.ticketSuccess'));
      void queryClient.invalidateQueries({
        queryKey: deviceQueries.coreAlerts(device.id).queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: deviceQueries.entitlements(device.id).queryKey,
      });
      setPending(null);
      form.resetFields();
      void navigate({ to: '/warranties' });
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('coreAlerts.error'));
    },
  });

  // Reset the guard once the mutation settles (success or error) so a
  // legitimate retry after a rejected/failed attempt isn't permanently
  // blocked.
  useEffect(() => {
    if (wasPending.current && !mutation.isPending) submitting.current = false;
    wasPending.current = mutation.isPending;
  }, [mutation.isPending]);

  // Reset the guard whenever the dialog closes, so the next open — a
  // genuinely new attempt — starts clean.
  useEffect(() => {
    if (pending === null) submitting.current = false;
  }, [pending]);

  if (!alerts.data || alerts.data.length === 0) return null;

  const preselectedEntitlementId =
    eligible.length === 1 ? (eligible[0]?.id ?? null) : null;

  return (
    <PortalCard title={t('coreAlerts.title')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {alerts.data.map((alert) => (
          <div
            key={alert.position}
            className="rounded-lg border border-[#F0C9C5] bg-[#FFF0EE] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-[#020204]">
                {t('coreAlerts.position', {
                  position: alert.position,
                  name: alert.coreName,
                })}
              </p>
              <Tag color={alert.status === 'assigned' ? 'blue' : 'red'}>
                {t('coreAlerts.status.' + alert.status)}
              </Tag>
            </div>
            <p className="mb-1 mt-2 text-xs text-[#636466]">
              {t('coreAlerts.code')}: <b>{alert.errorCode}</b> ·{' '}
              {t('coreAlerts.sku')}: <b>{alert.replacementSku}</b>
            </p>
            <PortalProgress value={alert.usedPercent} max={100} tone="danger" />
            <p className="mb-0 mt-1 text-xs text-[#636466]">
              {t('coreAlerts.usedPercent', {
                used: alert.usedPercent,
                threshold: alert.thresholdPercent,
              })}
            </p>
            {alert.status === 'open' ? (
              <Button
                className="mt-2"
                size="small"
                type="primary"
                onClick={() => {
                  // A fresh attempt starts here (modal opening for this
                  // alert) — see `ticketKeyRef` above.
                  ticketKeyRef.current = randomId();
                  setPending(alert);
                }}
              >
                {t('coreAlerts.createAppointment')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <Modal
        title={
          pending
            ? t('coreAlerts.modalTitle', { position: pending.position })
            : ''
        }
        open={pending !== null}
        onCancel={() => setPending(null)}
        onOk={() => {
          if (submitting.current) return;
          submitting.current = true;
          form.submit();
        }}
        confirmLoading={mutation.isPending}
        okText={t('coreAlerts.confirm')}
        cancelText={t('coreAlerts.cancel')}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={{
            reason: '',
            entitlementId: preselectedEntitlementId,
          }}
          onFinish={(values) => mutation.mutate(values)}
          onFinishFailed={() => {
            // Validation failed, so `mutate()` never ran and
            // `mutation.isPending` never flips — release the guard here
            // instead so the user can fix the field and submit again.
            submitting.current = false;
          }}
        >
          {eligible.length > 0 ? (
            <Form.Item
              name="entitlementId"
              label={t('coreAlerts.usePackage.label')}
            >
              <Radio.Group className="flex flex-col gap-2">
                {eligible.map((entitlement) => (
                  <Radio key={entitlement.id} value={entitlement.id}>
                    {t('coreAlerts.usePackage.option', {
                      name: entitlement.packageSnapshot.name,
                      remaining:
                        (entitlement.quota ?? 0) -
                        entitlement.used -
                        entitlement.reserved,
                    })}
                  </Radio>
                ))}
                <Radio value={null}>{t('coreAlerts.usePackage.none')}</Radio>
              </Radio.Group>
            </Form.Item>
          ) : null}
          <Form.Item
            name="reason"
            label={t('coreAlerts.reason')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('validation.required'),
              },
            ]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </PortalCard>
  );
}
