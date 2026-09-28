import { createFileRoute } from '@tanstack/react-router';

import { PageState } from '@/shared/components/PageState';

export const Route = createFileRoute('/$')({
  component: () => <PageState kind="notFound" />,
});
