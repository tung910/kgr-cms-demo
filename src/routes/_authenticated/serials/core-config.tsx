/* eslint-disable react-refresh/only-export-components */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { hasCapability } from '@/core/permissions/capabilities';
import { CoreConfigPage } from '@/features/serials/pages/CoreConfigPage';
import { RouteErrorState } from '@/shared/components/RouteErrorState';

const coreConfigSearchSchema = z.object({
  modelId: z.string().trim().min(1).optional().catch(undefined),
});

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
  const { modelId } = Route.useSearch();
  return <CoreConfigPage {...(modelId && { modelId })} />;
}
