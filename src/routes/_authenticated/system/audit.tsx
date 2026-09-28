/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { AuditLogPage } from '@/features/system/pages/AuditLogPage';
import { systemQueries } from '@/features/system/queries/systemQueries';
import { PageState } from '@/shared/components/PageState';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const auditSearchSchema = z.object({
  actor: z.string().catch(''),
  module: z.string().trim().min(1).optional().catch(undefined),
  action: z.string().catch(''),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50, 100].includes(value))
    .catch(25),
});

export const Route = createFileRoute('/_authenticated/system/audit')({
  validateSearch: auditSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'audit.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    const pageData = context.queryClient.query({
      ...systemQueries.audit(deps),
      staleTime: 'static',
    });
    if (cause === 'stay') {
      pageData.catch(() => undefined);
      return;
    }
    await pageData;
  },
  pendingMs: 200,
  pendingComponent: () => <PageState kind="loading" />,
  component: AuditLogRoute,
  errorComponent: RouteErrorState,
});

function AuditLogRoute() {
  return <AuditLogPage filters={Route.useSearch()} />;
}
