import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import type { RouterContext } from '@/app/router/router';
import { RouteErrorState } from '@/shared/components/RouteErrorState';
import { PageState } from '@/shared/components/PageState';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  pendingComponent: () => <PageState kind="loading" />,
  errorComponent: RouteErrorState,
  notFoundComponent: () => <PageState kind="notFound" />,
});
