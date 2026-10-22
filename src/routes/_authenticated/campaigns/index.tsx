/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { CampaignListSkeleton } from '@/features/campaigns/components/CampaignListSkeleton';
import { CampaignListPage } from '@/features/campaigns/pages/CampaignListPage';
import { campaignQueries } from '@/features/campaigns/queries/campaignQueries';
import { RouteErrorState } from '@/shared/components/RouteErrorState';
import type { CampaignListFilters } from '@/features/campaigns/schemas/campaignSchemas';

const campaignListSearchSchema = z.object({
  search: z.string().catch(''),
  status: z
    .enum([
      'draft',
      'pending_approval',
      'approved',
      'running',
      'ended',
      'rejected',
    ])
    .optional()
    .catch(undefined),
  kind: z.enum(['manual', 'trigger']).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50)
    .catch(10),
});

export const Route = createFileRoute('/_authenticated/campaigns/')({
  validateSearch: campaignListSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'campaign.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    const filters: CampaignListFilters = deps;
    const pageData = Promise.all([
      context.queryClient.query({
        ...campaignQueries.list(filters),
        staleTime: 'static',
      }),
      context.queryClient.query({
        ...campaignQueries.counts(filters),
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
  pendingComponent: CampaignListSkeleton,
  component: CampaignListRoute,
  errorComponent: RouteErrorState,
});

function CampaignListRoute() {
  return <CampaignListPage filters={Route.useSearch()} />;
}
