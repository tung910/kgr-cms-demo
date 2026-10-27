import { servicePackageDetailsSchema } from '../schemas/servicePackageConfiguration';
import type { PageResponse } from '@/shared/types/pagination';

import type {
  ServicePackage,
  ServicePackageDto,
  ServicePackageDraftDto,
  ServicePackageDraftInput,
  ServicePackagePageDto,
} from '../schemas/servicePackageSchemas';

export function mapServicePackage(dto: ServicePackageDto): ServicePackage {
  const details = servicePackageDetailsSchema.safeParse(dto);
  return {
    details: details.success
      ? {
          serviceTypeCode: details.data.service_type_code,
          purpose: details.data.purpose,
          includedItems: details.data.included_items,
          excludedItems: details.data.excluded_items,
          eligibilityDescription: details.data.eligibility_description,
          modelScope: details.data.model_scope,
          eligibleModelIds: details.data.eligible_model_ids,
          pricingMode: details.data.pricing_mode,
          pricingDescription: details.data.pricing_description,
          additionalCostDescription: details.data.additional_cost_description,
          configuration: details.data.configuration,
        }
      : null,
    id: dto.id,
    code: dto.code,
    name: dto.name,
    group: dto.group,
    billingType: dto.billing_type,
    status: dto.status,
    price: dto.price,
    billingPeriodMonths: dto.billing_period_months,
    termMonths: dto.term_months,
    eligibleModelCount: dto.eligible_model_count,
    description: dto.description,
    updatedAt: dto.updated_at,
  };
}

export function mapServicePackagePage(
  dto: ServicePackagePageDto
): PageResponse<ServicePackage> {
  return {
    items: dto.items.map(mapServicePackage),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}

export function mapServicePackageDraftInput(
  dto: ServicePackageDraftDto
): ServicePackageDraftInput {
  return {
    code: dto.code,
    name: dto.name,
    group: dto.group,
    billingType: dto.billing_type,
    price: dto.price,
    billingPeriodMonths: dto.billing_period_months,
    termMonths: dto.term_months,
    eligibleModelCount: dto.eligible_model_count,
    description: dto.description,
    serviceTypeCode: dto.service_type_code,
    purpose: dto.purpose,
    includedItems: dto.included_items,
    excludedItems: dto.excluded_items,
    eligibilityDescription: dto.eligibility_description,
    modelScope: dto.model_scope,
    eligibleModelIds: dto.eligible_model_ids,
    pricingMode: dto.pricing_mode,
    pricingDescription: dto.pricing_description,
    additionalCostDescription: dto.additional_cost_description,
    configuration: dto.configuration,
  };
}
