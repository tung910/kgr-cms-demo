/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { dashboardSearchSchema } from '@/features/dashboard/schemas/dashboardSchemas';

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: dashboardSearchSchema,
  component: DashboardRoute,
});

function DashboardRoute() {
  return <DashboardPage search={Route.useSearch()} />;
}
