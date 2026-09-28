/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '@/core/auth/useAuth';
import { hasMenuAccess } from '@/core/permissions/capabilities';
import { FirmwarePage } from '@/features/firmware/pages/FirmwarePage';
import { PageState } from '@/shared/components/PageState';

function FirmwareRoute() {
  const { session } = useAuth();

  if (!session || !hasMenuAccess(session.role, 'ota')) {
    return <PageState kind="forbidden" />;
  }

  return <FirmwarePage />;
}

export const Route = createFileRoute('/_authenticated/firmware')({
  component: FirmwareRoute,
});
