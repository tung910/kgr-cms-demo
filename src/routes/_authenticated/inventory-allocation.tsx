import { createFileRoute } from '@tanstack/react-router';

import { PortalSectionPage } from '@/features/portal/pages/PortalSectionPage';

export const Route = createFileRoute('/_authenticated/inventory-allocation')({
  component: () => (
    <PortalSectionPage titleKey="sections.inventoryAllocation" />
  ),
});
