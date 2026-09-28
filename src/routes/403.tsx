import { createFileRoute } from '@tanstack/react-router';

import { PageState } from '@/shared/components/PageState';

export const Route = createFileRoute('/403')({
  component: () => <PageState kind="forbidden" />,
});
