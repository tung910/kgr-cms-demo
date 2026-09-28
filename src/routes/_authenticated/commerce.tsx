import { createFileRoute } from '@tanstack/react-router';

import { PortalSectionPage } from '@/features/portal/pages/PortalSectionPage';

export const Route = createFileRoute('/_authenticated/commerce')({
  component: () => <PortalSectionPage titleKey="sections.commerce" />,
});
