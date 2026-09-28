import { createFileRoute } from '@tanstack/react-router';

import { PortalSectionPage } from '@/features/portal/pages/PortalSectionPage';

export const Route = createFileRoute('/_authenticated/automation')({
  component: () => <PortalSectionPage titleKey="sections.automation" />,
});
