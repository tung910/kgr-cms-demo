/* eslint-disable react-refresh/only-export-components */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Skeleton, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorCode } from '@/core/api/error';
import { useAuth } from '@/core/auth/useAuth';
import type { Capability } from '@/core/permissions/capabilities';
import { PageState } from '@/shared/components/PageState';
import {
  acknowledgeAlert,
  closeAlert,
  recordContactResult,
  takeOverAlert,
} from '../api/alertApi';
import { alertQueries } from '../queries/alertQueries';
import type { AlertDetail } from '../schemas/alertSchemas';
import { alertErrorMessage } from '../utils/alertErrors';
import { AlertHistoryTimeline } from './AlertHistoryTimeline';
import {
  AlertCustomerBlock,
  AlertDeviceBlock,
  AlertSiblingsBlock,
  AlertSummaryBlock,
} from './AlertInfoBlocks';
import { CloseAlertDialog } from './CloseAlertDialog';
import { ContactResultDialog } from './ContactResultDialog';

export type AlertAction =
  'acknowledge' | 'takeover' | 'contact' | 'close' | 'assign' | 'reassign';
export function getAlertActions(
  alert: AlertDetail,
  viewer: { userId: string; can: (capability: Capability) => boolean }
): AlertAction[] {
  const actions: AlertAction[] = [];
  const isHandler = alert.handler?.id === viewer.userId;
  if (viewer.can('alerts.handle') && alert.status === 'new')
    actions.push('acknowledge');
  if (
    viewer.can('alerts.handle') &&
    ['acknowledged', 'unreachable', 'ticketed'].includes(alert.status) &&
    alert.handler &&
    !isHandler
  )
    actions.push('takeover');
  if (
    viewer.can('alerts.handle') &&
    isHandler &&
    alert.handlerGroup === 'cskh' &&
    ['acknowledged', 'unreachable'].includes(alert.status)
  )
    actions.push('contact');
  if (
    viewer.can('alerts.handle') &&
    isHandler &&
    alert.handlerGroup === 'technical' &&
    alert.status === 'acknowledged'
  )
    actions.push('close');
  if (
    viewer.can('service.write') &&
    isHandler &&
    alert.status === 'ticketed' &&
    alert.ticket?.assignmentState === 'unassigned'
  )
    actions.push('assign');
  if (
    viewer.can('service.write') &&
    isHandler &&
    alert.status === 'ticketed' &&
    ['declined', 'expired'].includes(alert.ticket?.assignmentState ?? '')
  )
    actions.push('reassign');
  return actions;
}

export function AlertDetailDrawer({
  alertId,
  onClose,
}: {
  alertId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('alerts');
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery(alertQueries.detail(alertId));
  const [closeOpen, setCloseOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: alertQueries.all });
  const mutation = useMutation({
    mutationFn: ({
      action,
      result,
    }: {
      action: 'acknowledge' | 'takeover' | 'close';
      result?: string;
    }) =>
      action === 'acknowledge'
        ? acknowledgeAlert(alertId)
        : action === 'takeover'
          ? takeOverAlert(alertId)
          : closeAlert(alertId, result ?? ''),
    onSuccess: async (_, variables) => {
      setCloseOpen(false);
      void message.success(t(`actions.${variables.action}Success`));
      await refresh();
    },
    onError: async (error) => {
      setCloseOpen(false);
      void message.error(alertErrorMessage(error, t));
      await refresh();
    },
  });
  const errorCode = getApiErrorCode(query.error);
  const alert = query.data;
  const actions =
    alert && session
      ? getAlertActions(alert, {
          userId: session.user.id,
          can: (capability) => session.capabilities.includes(capability),
        })
      : [];
  const contact = useMutation({
    mutationFn: (input: Parameters<typeof recordContactResult>[1]) =>
      recordContactResult(alertId, input),
    onSuccess: async () => {
      setContactOpen(false);
      void message.success(t('contact.success'));
      await refresh();
    },
    onError: async (error) => {
      setContactOpen(false);
      void message.error(alertErrorMessage(error, t));
      await refresh();
    },
  });
  return (
    <Drawer
      title={alert?.name ?? t('detail.title')}
      width={720}
      open
      onClose={onClose}
      footer={
        alert && actions.length ? (
          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                type={action === 'acknowledge' ? 'primary' : 'default'}
                danger={action === 'close'}
                loading={
                  mutation.isPending && mutation.variables?.action === action
                }
                onClick={() => {
                  if (action === 'close') setCloseOpen(true);
                  else if (action === 'contact') setContactOpen(true);
                  else if (action === 'acknowledge' || action === 'takeover')
                    mutation.mutate({ action });
                }}
              >
                {t(`actions.${action}`)}
              </Button>
            ))}
          </div>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : query.isError ? (
        <PageState
          kind={
            errorCode === 'not_found'
              ? 'notFound'
              : errorCode === 'forbidden'
                ? 'forbidden'
                : 'error'
          }
          onRetry={() => void query.refetch()}
        />
      ) : alert ? (
        <div className="space-y-4">
          <AlertSummaryBlock alert={alert} />
          <AlertDeviceBlock alert={alert} />
          <AlertCustomerBlock alert={alert} />
          <AlertSiblingsBlock alert={alert} />
          <AlertHistoryTimeline alert={alert} />
        </div>
      ) : null}
      <CloseAlertDialog
        open={closeOpen}
        pending={mutation.isPending}
        onCancel={() => setCloseOpen(false)}
        onConfirm={(result) => mutation.mutate({ action: 'close', result })}
      />
      <ContactResultDialog
        open={contactOpen}
        canCreateTicket={Boolean(
          session?.capabilities.includes('service.write')
        )}
        pending={contact.isPending}
        onCancel={() => setContactOpen(false)}
        onSubmit={(input) => contact.mutate(input)}
        onAgreed={() => setContactOpen(false)}
      />
    </Drawer>
  );
}
