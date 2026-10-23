/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { CampaignWizardPage } from '@/features/campaigns/pages/CampaignWizardPage';
import { campaignQueries } from '@/features/campaigns/queries/campaignQueries';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const campaignWizardSearchSchema = z.object({
  // Set when editing an existing draft; absent when creating a new campaign.
  draftId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/campaigns/new')({
  validateSearch: campaignWizardSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'campaign.write'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    deps.draftId
      ? context.queryClient.query({
          ...campaignQueries.detail(deps.draftId),
          staleTime: 'static',
        })
      : undefined,
  component: CampaignWizardRoute,
  errorComponent: RouteErrorState,
});

function CampaignWizardRoute() {
  return <CampaignWizardPage draftId={Route.useSearch().draftId} />;
}
