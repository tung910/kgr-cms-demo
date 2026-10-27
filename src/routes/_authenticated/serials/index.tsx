/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { SerialListPage } from '@/features/serials/pages/SerialListPage';
import { serialQueries } from '@/features/serials/queries/serialQueries';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const serialListSearchSchema = z.object({
  search: z.string().catch(''),
  coreType: z.string().trim().min(1).optional().catch(undefined),
  batchId: z.string().trim().min(1).optional().catch(undefined),
  status: z.enum(['unused', 'used', 'recalled']).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50)
    .catch(20),
});

export const Route = createFileRoute('/_authenticated/serials/')({
  validateSearch: serialListSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'serial.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...serialQueries.list(deps),
      staleTime: 'static',
    }),
  component: SerialListRoute,
  errorComponent: RouteErrorState,
});

function SerialListRoute() {
  return <SerialListPage filters={Route.useSearch()} />;
}
