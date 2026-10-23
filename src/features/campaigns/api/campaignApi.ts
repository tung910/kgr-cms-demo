import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import type {
  AudienceDefinition,
  AudiencePreview,
} from '../schemas/audienceSchemas';
import { audiencePreviewDtoSchema } from '../schemas/audienceSchemas';
import {
  approverListDtoSchema,
  campaignCountsDtoSchema,
  campaignDtoSchema,
  campaignMetricsDtoSchema,
  campaignPageDtoSchema,
  coreOptionListDtoSchema,
  type Campaign,
  type CampaignApprover,
  type CampaignCountFilters,
  type CampaignCounts,
  type CampaignDraftInput,
  type CampaignListFilters,
  type CampaignMetrics,
  type CampaignTransitionInput,
  type CoreOption,
} from '../schemas/campaignSchemas';
import {
  mapAudiencePreview,
  mapCampaign,
  mapCampaignCounts,
  mapCampaignMetrics,
  mapCampaignPage,
} from './campaignMapper';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('campaigns:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function buildListParams(filters: CampaignListFilters): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.status) params.set('status', filters.status);
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.page > 0) params.set('page', String(filters.page));
  if (filters.pageSize > 0) params.set('page_size', String(filters.pageSize));
  return params;
}

export async function getCampaigns(
  filters: CampaignListFilters,
  signal?: AbortSignal
): Promise<PageResponse<Campaign>> {
  const response = await apiClient.get<unknown>(
    `/campaigns?${buildListParams(filters).toString()}`,
    { signal }
  );
  const parsed = campaignPageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaignPage(parsed.data);
}

export async function getCampaignCounts(
  filters: CampaignCountFilters,
  signal?: AbortSignal
): Promise<CampaignCounts> {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.kind) params.set('kind', filters.kind);
  const query = params.toString();
  const response = await apiClient.get<unknown>(
    query ? `/campaigns/counts?${query}` : '/campaigns/counts',
    { signal }
  );
  const parsed = campaignCountsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaignCounts(parsed.data);
}

export async function getCampaign(
  id: string,
  signal?: AbortSignal
): Promise<Campaign> {
  const response = await apiClient.get<unknown>(`/campaigns/${id}`, { signal });
  const parsed = campaignDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaign(parsed.data);
}

export async function createCampaign(
  input: CampaignDraftInput
): Promise<Campaign> {
  const response = await apiClient.post<unknown>('/campaigns', input);
  const parsed = campaignDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaign(parsed.data);
}

export async function updateCampaign(
  id: string,
  input: CampaignDraftInput
): Promise<Campaign> {
  const response = await apiClient.put<unknown>(`/campaigns/${id}`, input);
  const parsed = campaignDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaign(parsed.data);
}

export async function transitionCampaign(
  id: string,
  input: CampaignTransitionInput
): Promise<Campaign> {
  const response = await apiClient.post<unknown>(
    `/campaigns/${id}/transition`,
    input
  );
  const parsed = campaignDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaign(parsed.data);
}

export async function previewAudience(
  definition: AudienceDefinition,
  signal?: AbortSignal
): Promise<AudiencePreview> {
  const response = await apiClient.post<unknown>(
    '/campaigns/audience/preview',
    definition,
    { signal }
  );
  const parsed = audiencePreviewDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapAudiencePreview(parsed.data);
}

export async function getCampaignApprovers(
  signal?: AbortSignal
): Promise<CampaignApprover[]> {
  const response = await apiClient.get<unknown>('/campaigns/approvers', {
    signal,
  });
  const parsed = approverListDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data;
}

export async function getCoreOptions(
  signal?: AbortSignal
): Promise<CoreOption[]> {
  const response = await apiClient.get<unknown>('/campaigns/core-options', {
    signal,
  });
  const parsed = coreOptionListDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data;
}

export async function getCampaignMetrics(
  id: string,
  signal?: AbortSignal
): Promise<CampaignMetrics> {
  const response = await apiClient.get<unknown>(`/campaigns/${id}/metrics`, {
    signal,
  });
  const parsed = campaignMetricsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCampaignMetrics(parsed.data);
}

export async function testSendCampaign(input: {
  recipients: string[];
  title: string;
  content: string;
}): Promise<void> {
  await apiClient.post<unknown>('/campaigns/test-send', input);
}
