import { createRouter } from '@tanstack/react-router';

import { queryClient } from '@/app/providers/queryClient';
import type { AuthContextValue } from '@/core/auth/AuthProvider';
import { routeTree } from '@/routeTree.gen';

export interface RouterContext {
  queryClient: typeof queryClient;
  auth: AuthContextValue;
}

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: undefined as unknown as AuthContextValue,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
