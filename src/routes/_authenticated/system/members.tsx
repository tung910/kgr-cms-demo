/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { isPortalRole, type PortalRole } from '@/core/auth/types';
import { hasCapability } from '@/core/permissions/capabilities';
import { MemberAccessPage } from '@/features/system/pages/MemberAccessPage';
import { systemQueries } from '@/features/system/queries/systemQueries';
import { PageState } from '@/shared/components/PageState';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const memberSearchSchema = z.object({
  search: z.string().catch(''),
  roleId: z.custom<PortalRole>(isPortalRole).optional().catch(undefined),
  tab: z.enum(['members', 'roles']).catch('members'),
  groupId: z.custom<PortalRole>(isPortalRole).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50, 100].includes(value))
    .catch(10),
});

export const Route = createFileRoute('/_authenticated/system/members')({
  validateSearch: memberSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !(
          hasCapability(context.auth.session.role, 'member.read') ||
          hasCapability(context.auth.session.role, 'role.read')
        ))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    const pageData = context.queryClient.query({
      ...systemQueries.members(deps),
      staleTime: 'static',
    });
    // Keep the current list visible while filters/pagination change.
    if (cause === 'stay') {
      pageData.catch(() => undefined);
      return;
    }
    await pageData;
  },
  pendingMs: 200,
  pendingComponent: () => <PageState kind="loading" />,
  component: MemberListRoute,
  errorComponent: RouteErrorState,
});

function MemberListRoute() {
  return <MemberAccessPage search={Route.useSearch()} />;
}
