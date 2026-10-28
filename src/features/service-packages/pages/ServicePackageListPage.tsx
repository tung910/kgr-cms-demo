import { getApiErrorCode } from '@/core/api/error';
import { useState } from 'react';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  AppstoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';
import { PageState } from '@/shared/components/PageState';

import {
  setServicePackageAutoAttach,
  setServicePackageStatus,
} from '../api/servicePackageApi';
import { ServicePackageAutoAttachDialog } from '../components/ServicePackageAutoAttachDialog';
import { ServicePackageFilters } from '../components/ServicePackageFilters';
import { ServicePackageStatusDialog } from '../components/ServicePackageStatusDialog';
import { ServicePackageTable } from '../components/ServicePackageTable';
import { servicePackageQueries } from '../queries/servicePackageQueries';
import type {
  PackageStatus,
  ServicePackage,
  ServicePackageListFilters,
} from '../schemas/servicePackageSchemas';

export interface ServicePackageListPageProps {
  filters: ServicePackageListFilters;
}

const defaultFilters: ServicePackageListFilters = {
  search: '',
  page: 1,
  pageSize: 10,
};

interface StatusTarget {
  servicePackage: ServicePackage;
  status: Extract<PackageStatus, 'active' | 'archived'>;
}

interface AutoAttachTarget {
  servicePackage: ServicePackage;
  mode: 'enable' | 'disable';
}

export function ServicePackageListPage({
  filters,
}: ServicePackageListPageProps) {
  const { t } = useTranslation('servicePackages');
  const navigate = useNavigate({ from: '/service-packages/' });
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(servicePackageQueries.list(filters));
  const { data: stats } = useSuspenseQuery(servicePackageQueries.stats());
  const [target, setTarget] = useState<StatusTarget | null>(null);
  const mutation = useMutation({
    mutationFn: ({
      servicePackage,
      status,
      reason,
    }: StatusTarget & { reason: string }) =>
      setServicePackageStatus(servicePackage, { status, reason }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: servicePackageQueries.all,
      });
      void message.success(
        variables.status === 'active'
          ? t('statusDialog.publishSuccess')
          : t('statusDialog.archiveSuccess')
      );
      setTarget(null);
    },
    onError: (error) => {
      void message.error(
        getApiErrorCode(error) === 'configurationRequired'
          ? t('errors.configurationRequired')
          : t('errors.statusError')
      );
    },
  });
  const [autoAttachTarget, setAutoAttachTarget] =
    useState<AutoAttachTarget | null>(null);
  const autoAttachMutation = useMutation({
    mutationFn: ({
      servicePackage,
      mode,
      from,
      reason,
    }: AutoAttachTarget & { from: string | null; reason: string }) =>
      setServicePackageAutoAttach(
        servicePackage,
        { enabled: mode === 'enable', from, reason },
        // A fresh key per submit attempt: every click of the confirm button
        // is its own idempotent operation (spec §11).
        { idempotencyKey: crypto.randomUUID() }
      ),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: servicePackageQueries.all,
      });
      void message.success(
        variables.mode === 'enable'
          ? t('autoAttach.dialog.enableSuccess')
          : t('autoAttach.dialog.disableSuccess')
      );
      setAutoAttachTarget(null);
    },
    onError: (error) => {
      const code = getApiErrorCode(error);
      void message.error(
        code === 'autoAttachBlocked'
          ? t('errors.autoAttachBlocked')
          : code === 'autoAttachFromPast'
            ? t('errors.autoAttachFromPast')
            : code === 'noChange'
              ? t('errors.noChange')
              : code === 'idempotency_conflict'
                ? t('errors.idempotencyConflict')
                : t('errors.statusError')
      );
    },
  });

  const updateFilters = (changes: Partial<ServicePackageListFilters>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });
  };

  const handleConfirm = (reason: string) => {
    if (!target) return;
    mutation.mutate({ ...target, reason });
  };

  const handleAutoAttachConfirm = (values: {
    from: string | null;
    reason: string;
  }) => {
    if (!autoAttachTarget) return;
    autoAttachMutation.mutate({ ...autoAttachTarget, ...values });
  };

  const isPublish = target?.status === 'active';

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('listPage.title')}
        description={t('listPage.description', { total: stats.total })}
        actions={
          <PermissionGuard capability="service_package.write">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => void navigate({ to: '/service-packages/new' })}
            >
              {t('listPage.create')}
            </Button>
          </PermissionGuard>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PortalStatCard
          label={t('stats.total')}
          icon={<AppstoreOutlined />}
          tone="info"
          value={stats.total}
        />
        <PortalStatCard
          label={t('stats.active')}
          icon={<ShoppingOutlined />}
          tone="primary"
          value={stats.active}
        />
        <PortalStatCard
          label={t('stats.recurring')}
          icon={<ReloadOutlined />}
          tone="water"
          value={stats.recurring}
          detail={t('stats.recurringDetail')}
        />
      </div>
      <PortalCard padded={false}>
        <ServicePackageFilters
          filters={filters}
          onChange={updateFilters}
          onReset={() => void navigate({ search: defaultFilters })}
        />
        {data.items.length === 0 ? (
          <PageState kind="empty" description={t('listPage.empty')} />
        ) : (
          <ServicePackageTable
            data={data}
            filters={filters}
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
            onPublish={(servicePackage) =>
              setTarget({ servicePackage, status: 'active' })
            }
            onArchive={(servicePackage) =>
              setTarget({ servicePackage, status: 'archived' })
            }
            onToggleAutoAttach={(servicePackage) =>
              setAutoAttachTarget({
                servicePackage,
                mode: servicePackage.autoAttach ? 'disable' : 'enable',
              })
            }
          />
        )}
      </PortalCard>
      <ServicePackageStatusDialog
        open={target !== null}
        title={
          isPublish
            ? t('statusDialog.publishTitle')
            : t('statusDialog.archiveTitle')
        }
        warning={
          isPublish
            ? t('statusDialog.publishWarning')
            : t('statusDialog.archiveWarning')
        }
        okText={
          isPublish
            ? t('statusDialog.confirmPublish')
            : t('statusDialog.confirmArchive')
        }
        pending={mutation.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={handleConfirm}
      />
      <ServicePackageAutoAttachDialog
        open={autoAttachTarget !== null}
        mode={autoAttachTarget?.mode ?? 'enable'}
        pending={autoAttachMutation.isPending}
        onCancel={() => setAutoAttachTarget(null)}
        onConfirm={handleAutoAttachConfirm}
      />
    </div>
  );
}
