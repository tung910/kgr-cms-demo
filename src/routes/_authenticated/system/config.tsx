import { createFileRoute, redirect } from '@tanstack/react-router';

import { hasCapability } from '@/core/permissions/capabilities';
import { SystemConfigPage } from '@/features/system/pages/SystemConfigPage';
import { systemQueries } from '@/features/system/queries/systemQueries';
import { PageState } from '@/shared/components/PageState';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

export const Route = createFileRoute('/_authenticated/system/config')({
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'config.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loader: ({ context }) =>
    context.queryClient.query({
      ...systemQueries.config(),
      staleTime: 'static',
    }),
  pendingMs: 200,
  pendingComponent: () => <PageState kind="loading" />,
  component: SystemConfigPage,
  errorComponent: RouteErrorState,
});
