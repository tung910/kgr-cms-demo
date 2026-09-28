/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '@/core/auth/useAuth';
import { hasMenuAccess } from '@/core/permissions/capabilities';
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage';
import { PageState } from '@/shared/components/PageState';

function AnalyticsRoute() {
  const { session } = useAuth();

  if (!session || !hasMenuAccess(session.role, 'analytics')) {
    return <PageState kind="forbidden" />;
  }

  return <AnalyticsPage />;
}

export const Route = createFileRoute('/_authenticated/analytics-reports')({
  component: AnalyticsRoute,
});
