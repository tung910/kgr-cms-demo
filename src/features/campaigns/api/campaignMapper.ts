import type { PageResponse } from '@/shared/types/pagination';

import type {
  AudienceCustomer,
  AudienceCustomerDto,
  AudiencePreview,
  AudiencePreviewDto,
} from '../schemas/audienceSchemas';
import type {
  Campaign,
  CampaignCounts,
  CampaignCountsDto,
  CampaignDto,
  CampaignMetrics,
  CampaignMetricsDto,
  CampaignPageDto,
} from '../schemas/campaignSchemas';

export function mapCampaign(dto: CampaignDto): Campaign {
  return {
    id: dto.id,
    name: dto.name,
    kind: dto.kind,
    channel: dto.channel,
    contentVi: dto.content_vi,
    contentEn: dto.content_en,
    imageUrl: dto.image_url,
    deeplink: dto.deeplink,
    scheduleType: dto.schedule_type,
    startsAt: dto.starts_at,
    endsAt: dto.ends_at,
    status: dto.status,
    triggerPreset: dto.trigger_preset,
    frequencyCapPerCustomer: dto.frequency_cap_per_customer,
    audience: dto.audience,
    audienceCount: dto.audience_count,
    offer: dto.offer,
    createdBy: dto.created_by,
    createdByName: dto.created_by_name,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    approvedBy: dto.approved_by,
    approvedByName: dto.approved_by_name,
    approvedAt: dto.approved_at,
    rejectedReason: dto.rejected_reason,
  };
}

export function mapCampaignPage(dto: CampaignPageDto): PageResponse<Campaign> {
  return {
    items: dto.items.map(mapCampaign),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}

export function mapCampaignCounts(dto: CampaignCountsDto): CampaignCounts {
  return {
    total: dto.total,
    draft: dto.draft,
    pendingApproval: dto.pending_approval,
    approved: dto.approved,
    running: dto.running,
    ended: dto.ended,
    rejected: dto.rejected,
  };
}

export function mapCampaignMetrics(dto: CampaignMetricsDto): CampaignMetrics {
  return {
    sent: dto.sent,
    delivered: dto.delivered,
    opened: dto.opened,
    clicked: dto.clicked,
    conversionsBooking: dto.conversions_booking,
    conversionsQr: dto.conversions_qr,
    revenue: dto.revenue,
  };
}

export function mapAudienceCustomer(
  dto: AudienceCustomerDto
): AudienceCustomer {
  return {
    customerId: dto.customer_id,
    name: dto.name,
    region: dto.region,
    modelName: dto.model_name,
    firmwareVersion: dto.firmware_version,
    coreRemainingDays: dto.core_remaining_days,
    warrantyStatus: dto.warranty_status,
    loyaltyPoints: dto.loyalty_points,
    regionTds: dto.region_tds,
    tenureDays: dto.tenure_days,
    optIn: dto.opt_in,
  };
}

export function mapAudiencePreview(dto: AudiencePreviewDto): AudiencePreview {
  return {
    total: dto.total,
    matched: dto.matched,
    sample: dto.sample.map(mapAudienceCustomer),
    piiMasked: dto.pii_masked,
  };
}
