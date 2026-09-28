import { ApiError } from '@/core/api/error';
import { apiClient } from '@/core/api/apiClient';
import i18n from '@/core/i18n';

import {
  searchSuggestResponseDtoSchema,
  type SearchSuggestItem,
} from '../schemas/searchSchemas';

export async function getSearchSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<SearchSuggestItem[]> {
  const params = new URLSearchParams({ q: query });
  const response = await apiClient.get<unknown>(
    `/search/suggest?${params.toString()}`,
    { signal }
  );
  const parsed = searchSuggestResponseDtoSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError(
      'invalidResponse',
      i18n.t('common:globalSearch.invalidResponse'),
      undefined,
      parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.map(String).join('.'),
      }))
    );
  }

  return parsed.data.items.map((item) => ({
    group: item.group,
    label: item.label,
    sublabel: item.sublabel,
    navigateTo: item.navigate_to,
  }));
}
