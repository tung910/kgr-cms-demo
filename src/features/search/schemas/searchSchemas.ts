import { z } from 'zod';

export const searchSuggestGroupSchema = z.enum(['customer', 'device', 'alert']);
export type SearchSuggestGroup = z.infer<typeof searchSuggestGroupSchema>;

export const searchSuggestItemDtoSchema = z.object({
  group: searchSuggestGroupSchema,
  label: z.string(),
  sublabel: z.string(),
  navigate_to: z.string(),
});

export const searchSuggestResponseDtoSchema = z.object({
  items: z.array(searchSuggestItemDtoSchema),
});

export interface SearchSuggestItem {
  group: SearchSuggestGroup;
  label: string;
  sublabel: string;
  navigateTo: string;
}
