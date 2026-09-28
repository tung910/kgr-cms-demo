import { queryOptions } from '@tanstack/react-query';

import { getModelReferences } from './modelReferenceApi';

export const modelReferenceQueries = {
  all: ['reference', 'models'] as const,
  list: () =>
    queryOptions({
      queryKey: modelReferenceQueries.all,
      queryFn: ({ signal }) => getModelReferences(signal),
    }),
};
