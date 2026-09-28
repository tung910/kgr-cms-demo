import { queryOptions } from '@tanstack/react-query';

import { getCoreLifecycleConfig } from '../api/coreLifecycleApi';

export const coreLifecycleQueries = {
  all: ['serials', 'core-lifecycle'] as const,
  detail: () =>
    queryOptions({
      queryKey: [...coreLifecycleQueries.all, 'detail'] as const,
      queryFn: ({ signal }) => getCoreLifecycleConfig(signal),
    }),
};
