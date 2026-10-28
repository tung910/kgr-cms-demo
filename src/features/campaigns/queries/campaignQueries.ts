import { queryOptions } from '@tanstack/react-query';

import {
  getCampaign,
  getCampaignApprovers,
  getCampaignCounts,
  getCampaignMetrics,
  getCampaignPackageOptions,
  getCoreOptions,
  getCampaigns,
} from '../api/campaignApi';
import type { CampaignListFilters } from '../schemas/campaignSchemas';

export const campaignQueries = {
  all: ['campaigns'] as const,
  list: (filters: CampaignListFilters) =>
    queryOptions({
      queryKey: [...campaignQueries.all, 'list', filters] as const,
      queryFn: ({ signal }) => getCampaigns(filters, signal),
    }),
  counts: (filters: CampaignListFilters) => {
    const countFilters = { search: filters.search, kind: filters.kind };
    return queryOptions({
      queryKey: [...campaignQueries.all, 'counts', countFilters] as const,
      queryFn: ({ signal }) => getCampaignCounts(countFilters, signal),
    });
  },
  detail: (id: string) =>
    queryOptions({
      queryKey: [...campaignQueries.all, 'detail', id] as const,
      queryFn: ({ signal }) => getCampaign(id, signal),
    }),
  metrics: (id: string) =>
    queryOptions({
      queryKey: [...campaignQueries.all, 'metrics', id] as const,
      queryFn: ({ signal }) => getCampaignMetrics(id, signal),
    }),
  approvers: () =>
    queryOptions({
      queryKey: [...campaignQueries.all, 'approvers'] as const,
      queryFn: ({ signal }) => getCampaignApprovers(signal),
    }),
  coreOptions: () =>
    queryOptions({
      queryKey: [...campaignQueries.all, 'core-options'] as const,
      queryFn: ({ signal }) => getCoreOptions(signal),
    }),
  packageOptions: () =>
    queryOptions({
      queryKey: [...campaignQueries.all, 'package-options'] as const,
      queryFn: ({ signal }) => getCampaignPackageOptions(signal),
    }),
};
