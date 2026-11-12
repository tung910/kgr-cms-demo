/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { hasCapability } from '@/core/permissions/capabilities';
import {
  ALERT_HANDLER_GROUP_VALUES,
  ALERT_SEVERITY_VALUES,
  ALERT_STATUS_VALUES,
} from '@/features/alerts/constants/alertEnums';
import { AlertListSkeleton } from '@/features/alerts/components/AlertListSkeleton';
import {
  AlertListPage,
  type AlertListPageFilters,
} from '@/features/alerts/pages/AlertListPage';
import { alertQueries } from '@/features/alerts/queries/alertQueries';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const optionalText = z.string().trim().min(1).optional().catch(undefined);
const optionalFlag = z.boolean().optional().catch(undefined);
const alertSearchSchema = z.object({
  search: z.string().catch(''),
  severity: z.enum(ALERT_SEVERITY_VALUES).optional().catch(undefined),
  status: z.enum(ALERT_STATUS_VALUES).optional().catch(undefined),
  group: z.enum(ALERT_HANDLER_GROUP_VALUES).optional().catch(undefined),
  region: optionalText,
  model: optionalText,
  dateFrom: z.iso.date().optional().catch(undefined),
  dateTo: z.iso.date().optional().catch(undefined),
  mine: optionalFlag,
  overdue: optionalFlag,
  includeClosed: optionalFlag,
  alertId: optionalText,
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50)
    .catch(10),
});

export const Route = createFileRoute('/_authenticated/alerts/')({
  validateSearch: alertSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'alerts.read'))
    )
      throw redirect({ to: '/403' });
  },
  loaderDeps: ({ search }) => ({
    search: search.search,
    severity: search.severity,
    status: search.status,
    group: search.group,
    region: search.region,
    model: search.model,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    mine: search.mine,
    overdue: search.overdue,
    includeClosed: search.includeClosed,
    page: search.page,
    pageSize: search.pageSize,
  }),
  loader: async ({ context, deps, cause }) => {
    const request = Promise.all([
      context.queryClient.query({
        ...alertQueries.list(deps),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...alertQueries.counts(deps),
        staleTime: 'static',
      }),
    ]);
    if (cause === 'stay') {
      request.catch(() => undefined);
      return;
    }
    await request;
  },
  pendingMs: 200,
  pendingComponent: AlertListSkeleton,
  errorComponent: RouteErrorState,
  component: AlertListRoute,
});

function AlertListRoute() {
  return <AlertListPage filters={Route.useSearch() as AlertListPageFilters} />;
}
