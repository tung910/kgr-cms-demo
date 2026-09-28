import { queryOptions } from '@tanstack/react-query';

import { getSerialBatches, getSerials } from '../api/serialApi';
import type { SerialListFilters } from '../schemas/serialSchemas';

export const serialQueries = {
  all: ['serials'] as const,
  list: (filters: SerialListFilters) =>
    queryOptions({
      queryKey: [...serialQueries.all, 'list', filters] as const,
      queryFn: ({ signal }) => getSerials(filters, signal),
    }),
  batches: () =>
    queryOptions({
      queryKey: [...serialQueries.all, 'batches'] as const,
      queryFn: ({ signal }) => getSerialBatches(signal),
    }),
};
