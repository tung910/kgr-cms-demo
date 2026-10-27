/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { CoreConfigPage } from '@/features/serials/pages/CoreConfigPage';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const coreConfigSearchSchema = z.object({
  lifespanStatus: z.enum(['pending', 'confirmed']).optional().catch(undefined),
  coreType: z.string().trim().min(1).optional().catch(undefined),
});

// Every serial.read role sees the batch tab (logistics declares regions
// there); core types and the change log are gated inside the page.
export const Route = createFileRoute('/_authenticated/serials/core-config')({
  validateSearch: coreConfigSearchSchema,
  beforeLoad: ({ context }) => {
    if (
      context.auth.status === 'authenticated' &&
      (!context.auth.session ||
        !hasCapability(context.auth.session.role, 'serial.read'))
    ) {
      throw redirect({ to: '/403' });
    }
  },
  component: CoreConfigRoute,
  errorComponent: RouteErrorState,
});

function CoreConfigRoute() {
  const { lifespanStatus, coreType } = Route.useSearch();
  return (
    <CoreConfigPage
      filters={{
        ...(lifespanStatus && { lifespanStatus }),
        ...(coreType && { coreType }),
      }}
    />
  );
}
