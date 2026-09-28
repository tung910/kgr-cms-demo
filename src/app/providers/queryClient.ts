import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/api/error';

const fiveMinutes = 5 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: fiveMinutes,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        error instanceof ApiError &&
        (error.kind === 'network' || error.kind === 'server') &&
        failureCount < 2,
    },
    mutations: {
      retry: false,
    },
  },
});
