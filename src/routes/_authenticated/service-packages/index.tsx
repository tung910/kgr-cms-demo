/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { ServicePackageListSkeleton } from '@/features/service-packages/components/ServicePackageListSkeleton';
import { ServicePackageListPage } from '@/features/service-packages/pages/ServicePackageListPage';
import { servicePackageQueries } from '@/features/service-packages/queries/servicePackageQueries';
import {
  billingTypeSchema,
  packageStatusSchema,
  servicePackageGroupSchema,
  type ServicePackageListFilters,
} from '@/features/service-packages/schemas/servicePackageSchemas';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const servicePackageSearchSchema = z.object({
  search: z.string().catch(''),
  group: servicePackageGroupSchema.optional().catch(undefined),
  billingType: billingTypeSchema.optional().catch(undefined),
  status: packageStatusSchema.optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50)
    .catch(10),
});

export const Route = createFileRoute('/_authenticated/service-packages/')({
  validateSearch: servicePackageSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'service_package.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    const filters: ServicePackageListFilters = { ...deps };
    const pageData = Promise.all([
      context.queryClient.query({
        ...servicePackageQueries.list(filters),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...servicePackageQueries.stats(),
        staleTime: 'static',
      }),
    ]);
    if (cause === 'stay') {
      pageData.catch(() => undefined);
      return;
    }
    await pageData;
  },
  pendingMs: 200,
  pendingComponent: ServicePackageListSkeleton,
  component: ServicePackageListRoute,
  errorComponent: RouteErrorState,
});

function ServicePackageListRoute() {
  const search = Route.useSearch();
  const filters: ServicePackageListFilters = { ...search };
  return <ServicePackageListPage filters={filters} />;
}
