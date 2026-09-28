import { createFileRoute } from '@tanstack/react-router';

import { PortalSectionPage } from '@/features/portal/pages/PortalSectionPage';

export const Route = createFileRoute('/_authenticated/warranties')({
  component: () => <PortalSectionPage titleKey="sections.warranties" />,
});
