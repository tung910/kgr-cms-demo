import type { PageResponse } from '@/shared/types/pagination';

import type {
  ServicePackage,
  ServicePackageDto,
  ServicePackagePageDto,
} from '../schemas/servicePackageSchemas';

export function mapServicePackage(dto: ServicePackageDto): ServicePackage {
  return {
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
