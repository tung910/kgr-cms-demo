import { useDeferredValue } from 'react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { Button, DatePicker, Input, Select, message } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PageState } from '@/shared/components/PageState';
import { PortalCard, PortalPageHeader } from '@/shared/components/portal';

import { exportAuditLogs } from '../api/systemApi';
import { AuditTable } from '../components/AuditTable';
import { AUDIT_MODULES } from '../constants/auditModules';
import { systemQueries } from '../queries/systemQueries';
import type { AuditFilters } from '../schemas/systemSchemas';
import { downloadAuditCsv } from '../utils/exportAuditCsv';
import { systemErrorMessage } from '../utils/systemErrors';

export interface AuditLogPageProps {
  filters: AuditFilters;
}

const dateFormat = 'YYYY-MM-DD';

export function AuditLogPage({ filters }: AuditLogPageProps) {
  const { t } = useTranslation('system');
  const navigate = useNavigate({ from: '/system/audit' });
  const { data } = useSuspenseQuery(
    systemQueries.audit(useDeferredValue(filters))
  );

  const exportMutation = useMutation({
    mutationFn: () => exportAuditLogs(filters),
    onSuccess: (entries) => downloadAuditCsv(entries),
    onError: (error) => void message.error(systemErrorMessage(t, error)),
  });

  const updateFilters = (changes: Partial<AuditFilters>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });
  };
  const hasFilters = Boolean(
    filters.actor ||
    filters.module ||
    filters.action ||
    filters.from ||
    filters.to
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        actions={
          <PermissionGuard capability="audit.export">
            <Button
              loading={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              {t('audit.export')}
            </Button>
          </PermissionGuard>
        }
      />
      <PortalCard padded={false}>
        <div className="grid grid-cols-1 gap-3 border-b border-brand-lightgray p-4 sm:flex sm:flex-wrap sm:items-center">
          <Input.Search
            key={`actor:${filters.actor}`}
            allowClear
            aria-label={t('audit.filters.actorAriaLabel')}
            defaultValue={filters.actor}
            placeholder={t('audit.filters.actorPlaceholder')}
            className="w-full sm:w-56"
            onSearch={(actor) => updateFilters({ actor })}
          />
          <Select
            allowClear
            aria-label={t('audit.filters.moduleAriaLabel')}
            placeholder={t('audit.filters.modulePlaceholder')}
            value={filters.module}
            className="w-full sm:w-48"
            options={AUDIT_MODULES.map((item) => ({
              value: item.value,
              label: t(item.labelKey),
            }))}
            onChange={(module) => updateFilters({ module })}
          />
          <Input.Search
            key={`action:${filters.action}`}
            allowClear
            aria-label={t('audit.filters.actionAriaLabel')}
            defaultValue={filters.action}
            placeholder={t('audit.filters.actionPlaceholder')}
            className="w-full sm:w-48"
            onSearch={(action) => updateFilters({ action })}
          />
          <DatePicker.RangePicker
            aria-label={t('audit.filters.rangeAriaLabel')}
            allowEmpty={[true, true]}
            value={[
              filters.from ? dayjs(filters.from, dateFormat) : null,
              filters.to ? dayjs(filters.to, dateFormat) : null,
            ]}
            onChange={(range) =>
              updateFilters({
                from: range?.[0]?.format(dateFormat),
                to: range?.[1]?.format(dateFormat),
              })
            }
          />
          {hasFilters ? (
            <Button
              onClick={() =>
                void navigate({
                  search: (previous) => ({
                    pageSize: previous.pageSize,
                    actor: '',
                    action: '',
                    page: 1,
                  }),
                })
              }
            >
              {t('audit.filters.reset')}
            </Button>
          ) : null}
        </div>
        {data.items.length === 0 ? (
          <PageState
            kind="empty"
            description={
              hasFilters ? t('audit.emptyFiltered') : t('audit.empty')
            }
          />
        ) : (
          <AuditTable
            data={data}
            filters={filters}
            onPageChange={(page, pageSize) =>
              void navigate({
                search: (previous) => ({ ...previous, page, pageSize }),
              })
            }
          />
        )}
      </PortalCard>
    </div>
  );
}
