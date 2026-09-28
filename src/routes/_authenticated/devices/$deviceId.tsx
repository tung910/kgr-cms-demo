/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { normalizeApiError } from '@/core/api/error';
import { hasCapability } from '@/core/permissions/capabilities';
import { DeviceDetailPage } from '@/features/devices/pages/DeviceDetailPage';
import { deviceQueries } from '@/features/devices/queries/deviceQueries';
import { PageState } from '@/shared/components/PageState';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

export const Route = createFileRoute('/_authenticated/devices/$deviceId')({
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'device.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...deviceQueries.detail(params.deviceId),
      staleTime: 'static',
    }),
  component: DeviceDetailRoute,
  errorComponent: DeviceDetailError,
});

function DeviceDetailRoute() {
  return <DeviceDetailPage deviceId={Route.useParams().deviceId} />;
}

function DeviceDetailError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const { t } = useTranslation('devices');
  const apiError = normalizeApiError(error);

  if (apiError.kind === 'notFound') {
    return <PageState kind="notFound" title={t('detailPage.notFoundTitle')} />;
  }

  return <RouteErrorState error={apiError} reset={reset} />;
}
