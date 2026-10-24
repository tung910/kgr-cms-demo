/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { normalizeApiError } from '@/core/api/error';
import { hasCapability } from '@/core/permissions/capabilities';
import { CampaignDetailPage } from '@/features/campaigns/pages/CampaignDetailPage';
import { campaignQueries } from '@/features/campaigns/queries/campaignQueries';
import { PageState } from '@/shared/components/PageState';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

export const Route = createFileRoute('/_authenticated/campaigns/$campaignId')({
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'campaign.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...campaignQueries.detail(params.campaignId),
      staleTime: 'static',
    }),
  component: CampaignDetailRoute,
  errorComponent: CampaignDetailError,
});

function CampaignDetailRoute() {
  return <CampaignDetailPage campaignId={Route.useParams().campaignId} />;
}

function CampaignDetailError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const { t } = useTranslation('campaigns');
  const apiError = normalizeApiError(error);

  if (apiError.kind === 'notFound') {
    return <PageState kind="notFound" title={t('detail.notFoundTitle')} />;
  }

  return <RouteErrorState error={apiError} reset={reset} />;
}
