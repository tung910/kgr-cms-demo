/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { DeviceListSkeleton } from '@/features/devices/components/DeviceListSkeleton';
import { DeviceListPage } from '@/features/devices/pages/DeviceListPage';
import { deviceQueries } from '@/features/devices/queries/deviceQueries';
import { RouteErrorState } from '@/shared/components/RouteErrorState';
import {
  deviceStatusSchema,
  type CoreLifeRange,
  type DeviceListFilters,
} from '@/features/devices/schemas/deviceSchemas';

const coreLifeSchema = z
  .string()
  .regex(/^(10_20|21_30|custom:\d+:\d+)$/)
  .optional()
  .catch(undefined);
const offlineDurationSchema = z.enum([
  'under_30m',
  '30m_2h',
  '2h_24h',
  'above_24h',
]);
const deviceErrorTypeSchema = z.enum(['connectivity', 'waterLeak', 'other']);

const deviceListSearchSchema = z.object({
  search: z.string().catch(''),
  status: deviceStatusSchema.optional().catch(undefined),
  model: z.string().trim().min(1).optional().catch(undefined),
  region: z.string().trim().min(1).optional().catch(undefined),
  customerId: z.string().trim().min(1).optional().catch(undefined),
  coreLife: coreLifeSchema,
  offlineDuration: offlineDurationSchema.optional().catch(undefined),
  errorType: deviceErrorTypeSchema.optional().catch(undefined),
  moduleFirmware: z.string().trim().min(1).optional().catch(undefined),
  activatedFrom: z.string().trim().min(1).optional().catch(undefined),
  activatedTo: z.string().trim().min(1).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50)
    .catch(10),
});

export const Route = createFileRoute('/_authenticated/devices/')({
  validateSearch: deviceListSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'device.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    const filters: DeviceListFilters = {
      ...deps,
      coreLife: deps.coreLife as CoreLifeRange | undefined,
    };
    const pageData = Promise.all([
      context.queryClient.query({
        ...deviceQueries.list(filters),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...deviceQueries.statusCounts(filters),
        staleTime: 'static',
      }),
    ]);
    // Block (and show the skeleton) only when entering the page; filter and
    // pagination changes keep the current list visible while the page fetches.
    if (cause === 'stay') {
      pageData.catch(() => undefined);
      return;
    }
    await pageData;
  },
  pendingMs: 200,
  pendingComponent: DeviceListSkeleton,
  component: DeviceListRoute,
  errorComponent: RouteErrorState,
});

function DeviceListRoute() {
  const search = Route.useSearch();
  const filters: DeviceListFilters = {
    ...search,
    coreLife: search.coreLife as CoreLifeRange | undefined,
  };
  return <DeviceListPage filters={filters} />;
}
