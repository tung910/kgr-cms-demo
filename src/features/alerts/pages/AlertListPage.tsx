import {
  DownloadOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button, message } from 'antd';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/core/auth/useAuth';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { hasCapability } from '@/core/permissions/capabilities';
import { PageState } from '@/shared/components/PageState';
import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import { formatDateTimeInLocale } from '@/shared/lib/format';
import { acknowledgeAlert, getAllAlerts } from '../api/alertApi';
import { AlertFilters } from '../components/AlertFilters';
import { AlertTable } from '../components/AlertTable';
import { alertQueries } from '../queries/alertQueries';
import type { AlertListFilters } from '../schemas/alertSchemas';
import { alertErrorMessage } from '../utils/alertErrors';
import { downloadAlertsCsv } from '../utils/exportAlertsToCsv';
import { useNow } from '../utils/useNow';

export type AlertListPageFilters = AlertListFilters & { alertId?: string };
const defaults: AlertListPageFilters = { search: '', page: 1, pageSize: 10 };
export function AlertListPage({ filters }: { filters: AlertListPageFilters }) {
  const { t, i18n } = useTranslation('alerts');
  const { session } = useAuth();
  const navigate = useNavigate({ from: '/alerts/' });
  const queryClient = useQueryClient();
  const deferred = useDeferredValue(filters);
  const { data } = useSuspenseQuery(alertQueries.list(deferred));
  const { data: counts } = useSuspenseQuery(alertQueries.counts(deferred));
  const canHandle = Boolean(
    session && hasCapability(session.role, 'alerts.handle')
  );
  const now = useNow();
  const [exporting, setExporting] = useState(false);
  const claim = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertQueries.all });
      void message.success(t('page.claimSuccess'));
    },
    onError: async (error) => {
      void message.error(alertErrorMessage(error, t));
      await queryClient.invalidateQueries({ queryKey: alertQueries.all });
    },
  });
  const update = (changes: Partial<AlertListPageFilters>) =>
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });
  const exportAll = async () => {
    setExporting(true);
    try {
      const alerts = await getAllAlerts(filters);
      downloadAlertsCsv(alerts, {
        headers: {
          name: t('table.name'),
          severity: t('table.severity'),
          errorCode: t('table.errorCode'),
          deviceId: t('table.deviceId'),
          model: t('table.model'),
          region: t('table.region'),
          raisedAt: t('table.raisedAt'),
          status: t('table.status'),
          handler: t('table.handler'),
          ticketCode: t('export.ticketCode'),
          ticketStatus: t('export.ticketStatus'),
        },
        severity: (value) => t(`severity.${value}`),
        status: (value) => t(`status.${value}`),
        ticketStatus: (value) => t(`ticketStatus.${value}`),
        formatDateTime: (value) =>
          formatDateTimeInLocale(value, i18n.resolvedLanguage),
      });
      void message.success(t('export.success', { count: alerts.length }));
    } catch (error) {
      void message.error(alertErrorMessage(error, t));
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description', { total: data.total })}
        actions={
          <PermissionGuard capability="alerts.export">
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={() => void exportAll()}
            >
              {t('page.export')}
            </Button>
          </PermissionGuard>
        }
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <PortalStatCard
          label={t('stats.open')}
          value={counts.open}
          icon={<InboxOutlined />}
          tone="info"
        />
        <PortalStatCard
          label={t('stats.criticalOpen')}
          value={counts.criticalOpen}
          icon={<ExclamationCircleOutlined />}
          tone="danger"
        />
        <PortalStatCard
          label={t('stats.overdue')}
          value={counts.overdue}
          icon={<WarningOutlined />}
          tone="warning"
        />
        {canHandle ? (
          <PortalStatCard
            label={t('stats.mine')}
            value={counts.mine}
            icon={<UserOutlined />}
          />
        ) : null}
      </div>
      <PortalCard padded={false}>
        <AlertFilters
          filters={filters}
          onChange={update}
          onReset={() => void navigate({ search: defaults })}
        />
        {data.items.length ? (
          <AlertTable
            data={data}
            filters={deferred}
            now={now}
            canHandle={canHandle}
            claimingId={claim.isPending ? claim.variables : undefined}
            onClaim={(id) => claim.mutate(id)}
            onOpen={(alertId) => update({ alertId })}
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
          />
        ) : (
          <PageState kind="empty" description={t('page.empty')} />
        )}
      </PortalCard>
    </div>
  );
}
