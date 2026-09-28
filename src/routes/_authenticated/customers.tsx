/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '@/core/auth/useAuth';
import { hasMenuAccess } from '@/core/permissions/capabilities';
import { CustomersPage } from '@/features/customers/pages/CustomersPage';
import { PageState } from '@/shared/components/PageState';

function CustomersRoute() {
  const { session } = useAuth();

  if (!session || !hasMenuAccess(session.role, 'customers')) {
    return <PageState kind="forbidden" />;
  }

  return <CustomersPage />;
}

export const Route = createFileRoute('/_authenticated/customers')({
  component: CustomersRoute,
});
