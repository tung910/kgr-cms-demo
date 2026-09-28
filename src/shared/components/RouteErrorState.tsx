import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

import { normalizeApiError } from '@/core/api/error';

import { PageState } from './PageState';

export interface RouteErrorStateProps {
  error: unknown;
  reset: () => void;
}

export function RouteErrorState({ error, reset }: RouteErrorStateProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();
  const apiError = normalizeApiError(error);

  if (apiError.kind === 'forbidden') {
    return <PageState kind="forbidden" description={apiError.message} />;
  }

  const retry = () => {
    queryErrorResetBoundary.reset();
    reset();
    void router.invalidate();
  };

  return (
    <PageState kind="error" description={apiError.message} onRetry={retry} />
  );
}
