/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '@/core/auth/useAuth';
import { hasMenuAccess } from '@/core/permissions/capabilities';
import { AlertsPage } from '@/features/alerts/pages/AlertsPage';
import { PageState } from '@/shared/components/PageState';

function AlertsRoute() {
  const { session } = useAuth();

  if (!session || !hasMenuAccess(session.role, 'alerts')) {
    return <PageState kind="forbidden" />;
  }

  return <AlertsPage />;
}

export const Route = createFileRoute('/_authenticated/alerts')({
  component: AlertsRoute,
});
