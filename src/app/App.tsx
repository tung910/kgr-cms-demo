import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/core/auth/useAuth';
import { PageState } from '@/shared/components/PageState';

import { router } from './router/router';

export function App() {
  const auth = useAuth();
  const lastInvalidatedAuthKey = useRef<string | null>(null);
  const authKey = `${auth.status}:${auth.session?.user.id ?? ''}:${auth.session?.role ?? ''}:${auth.session?.simulatedFrom?.role ?? ''}`;

  useEffect(() => {
    if (
      auth.status === 'loading' ||
      lastInvalidatedAuthKey.current === authKey
    ) {
      return;
    }

    lastInvalidatedAuthKey.current = authKey;
    void router.invalidate();
  }, [auth.status, authKey]);

  if (auth.status === 'loading') {
    return <PageState kind="loading" />;
  }

  return (
    <QueryErrorResetBoundary>
      <RouterProvider router={router} context={{ auth }} />
    </QueryErrorResetBoundary>
  );
}
