/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '@/core/auth/useAuth';
import { hasMenuAccess } from '@/core/permissions/capabilities';
import { MapPage } from '@/features/maps/pages/MapPage';
import { PageState } from '@/shared/components/PageState';

function MapsRoute() {
  const { session } = useAuth();

  if (!session || !hasMenuAccess(session.role, 'device_map')) {
    return <PageState kind="forbidden" />;
  }

  return <MapPage />;
}

export const Route = createFileRoute('/_authenticated/maps')({
  component: MapsRoute,
});
