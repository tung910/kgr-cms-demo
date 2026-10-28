import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import {
  mapServicePackage,
  mapServicePackagePage,
} from './servicePackageMapper';
import {
  servicePackageDtoSchema,
  servicePackageDraftInputSchema,
  servicePackagePageDtoSchema,
  servicePackageStatsDtoSchema,
  type ServicePackage,
  type ServicePackageDraftInput,
  type ServicePackageListFilters,
  type ServicePackageStats,
  type SetPackageAutoAttachInput,
  type SetPackageStatusInput,
} from '../schemas/servicePackageSchemas';

// Idempotency-Key header shared by write endpoints that must tolerate a
// resubmitted request without double-applying it (spec §11, plan "Phạm vi
// cập nhật 28/10/2026"). The UI layer generates this value once per
// user-initiated submission attempt.
function idempotencyHeaders(
  idempotencyKey?: string
): { headers: Record<string, string> } | undefined {
  return idempotencyKey
    ? { headers: { 'Idempotency-Key': idempotencyKey } }
    : undefined;
}

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('servicePackages:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function getListPath(filters: ServicePackageListFilters): string {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.group) params.set('group', filters.group);
  if (filters.billingType) params.set('billing_type', filters.billingType);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 0) params.set('page', String(filters.page));
  if (filters.pageSize > 0) params.set('page_size', String(filters.pageSize));
  const query = params.toString();
  return query ? `/service-packages?${query}` : '/service-packages';
}

export async function getServicePackages(
  filters: ServicePackageListFilters,
  signal?: AbortSignal
): Promise<PageResponse<ServicePackage>> {
  const response = await apiClient.get<unknown>(getListPath(filters), {
    signal,
  });
  const parsed = servicePackagePageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapServicePackagePage(parsed.data);
}

// Create a new package. It is persisted as a draft; the server assigns the id
// and timestamps, and rejects a duplicate code.
export function toServicePackageDraftDto(input: ServicePackageDraftInput) {
  return servicePackageDraftInputSchema.parse({
    service_type_code: input.serviceTypeCode,
    purpose: input.purpose,
    included_items: input.includedItems,
    excluded_items: input.excludedItems,
    eligibility_description: input.eligibilityDescription,
    model_scope: input.modelScope,
    eligible_model_ids: input.eligibleModelIds,
    pricing_mode: input.pricingMode,
    pricing_description: input.pricingDescription,
    additional_cost_description: input.additionalCostDescription,
    configuration: input.configuration,
    code: input.code,
    name: input.name,
    group: input.group,
    billing_type: input.billingType,
    price: input.price,
    billing_period_months: input.billingPeriodMonths,
    term_months: input.termMonths,
    quota_mode: input.quotaMode,
    custom_quota: input.customQuota,
    auto_attach: input.autoAttach,
    auto_attach_from: input.autoAttachFrom,
    eligible_model_count: input.eligibleModelCount,
    description: input.description,
  });
}

export async function createServicePackage(
  input: ServicePackageDraftInput,
  options?: { idempotencyKey?: string }
): Promise<ServicePackage> {
  const response = await apiClient.post<unknown>(
    '/service-packages',
    toServicePackageDraftDto(input),
    idempotencyHeaders(options?.idempotencyKey)
  );
  const parsed = servicePackageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapServicePackage(parsed.data);
}

export async function getServicePackageStats(
  signal?: AbortSignal
): Promise<ServicePackageStats> {
  const response = await apiClient.get<unknown>('/service-packages/stats', {
    signal,
  });
  const parsed = servicePackageStatsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data;
}

// Publish a draft or archive an active package. The reason and the computed
// before/after change feed the immutable audit log; server values win.
export async function setServicePackageStatus(
  servicePackage: ServicePackage,
  input: SetPackageStatusInput
): Promise<ServicePackage> {
  const response = await apiClient.post<unknown>(
    '/service-packages/' + encodeURIComponent(servicePackage.id) + '/status',
    {
      status: input.status,
      reason: input.reason,
      changes: [
        {
          field: 'status',
          before_value: servicePackage.status,
          after_value: input.status,
        },
      ],
    }
  );
  const parsed = servicePackageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapServicePackage(parsed.data);
}

// Toggle auto-attach-on-stock-intake (spec §4.1). Enabling requires an
// effective date (server rejects a date before today); disabling only needs a
// reason. The reason and before/after values feed the immutable audit log.
export async function setServicePackageAutoAttach(
  servicePackage: ServicePackage,
  input: SetPackageAutoAttachInput,
  options?: { idempotencyKey?: string }
): Promise<ServicePackage> {
  const response = await apiClient.post<unknown>(
    '/service-packages/' +
      encodeURIComponent(servicePackage.id) +
      '/auto-attach',
    {
      enabled: input.enabled,
      from: input.from,
      reason: input.reason,
      changes: [
        {
          field: 'auto_attach',
          before_value: String(servicePackage.autoAttach),
          after_value: String(input.enabled),
        },
        {
          field: 'auto_attach_from',
          before_value: servicePackage.autoAttachFrom ?? '',
          after_value: input.from ?? '',
        },
      ],
    },
    idempotencyHeaders(options?.idempotencyKey)
  );
  const parsed = servicePackageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapServicePackage(parsed.data);
}
