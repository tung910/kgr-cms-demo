/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '@/shared/components/AppShell';
import { PageState } from '@/shared/components/PageState';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (context.auth.status === 'anonymous') {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  if (Route.useRouteContext().auth.status === 'loading') {
    return <PageState kind="loading" />;
  }

  return <AppShell />;
}
