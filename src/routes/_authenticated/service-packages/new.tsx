import { createFileRoute, redirect } from '@tanstack/react-router';

import { hasCapability } from '@/core/permissions/capabilities';
import { ServicePackageCreatePage } from '@/features/service-packages/pages/ServicePackageCreatePage';
import { ServicePackageListSkeleton } from '@/features/service-packages/components/ServicePackageListSkeleton';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

export const Route = createFileRoute('/_authenticated/service-packages/new')({
  beforeLoad: ({ context }) => {
    if (
      !context.auth.session ||
      !hasCapability(context.auth.session.role, 'service_package.write')
    )
      throw redirect({ to: '/403' });
  },
  component: ServicePackageCreatePage,
  pendingMs: 200,
  pendingComponent: ServicePackageListSkeleton,
  errorComponent: RouteErrorState,
});
