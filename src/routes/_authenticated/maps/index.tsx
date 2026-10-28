/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { MapSkeleton } from '@/features/maps/components/MapSkeleton';
import { MapPage } from '@/features/maps/pages/MapPage';
import { mapQueries } from '@/features/maps/queries/mapQueries';
import { RouteErrorState } from '@/shared/components/RouteErrorState';
import { MAP_REGION_STATUS_VALUES } from '@/shared/constants/mapRegionStatus';

const optionalText = z.string().trim().min(1).optional().catch(undefined);

const mapSearchSchema = z.object({
  model: optionalText,
  status: z.enum(MAP_REGION_STATUS_VALUES).optional().catch(undefined),
  dateFrom: z.iso.date().optional().catch(undefined),
  dateTo: z.iso.date().optional().catch(undefined),
  regionId: optionalText,
});

export const Route = createFileRoute('/_authenticated/maps/')({
  validateSearch: mapSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'device_map.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  // regionId only selects a marker; it must not refetch the map data.
  loaderDeps: ({ search }) => ({
    model: search.model,
    status: search.status,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  }),
  loader: async ({ context, deps, cause }) => {
    const pageData = Promise.all([
      context.queryClient.query({
        ...mapQueries.summary(deps),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...mapQueries.regions(deps),
        staleTime: 'static',
      }),
    ]);
    // Keep the current map visible while filters change.
    if (cause === 'stay') {
      pageData.catch(() => undefined);
      return;
    }
    await pageData;
  },
  pendingMs: 200,
  pendingComponent: MapSkeleton,
  component: MapRoute,
  errorComponent: RouteErrorState,
});

function MapRoute() {
  return <MapPage filters={Route.useSearch()} />;
}
