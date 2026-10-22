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
    tenantId: dto.tenant_id,
    priority: dto.priority,
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
    paused: dto.paused,
    ended: dto.ended,
    rejected: dto.rejected,
  };
}

export function mapCampaignMetrics(dto: CampaignMetricsDto): CampaignMetrics {
  return {
    attributionModel: dto.attribution_model,
    attributionWindowDays: dto.attribution_window_days,
    sendId: dto.send_id,
    failed: dto.failed,
    failureReason: dto.failure_reason,
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
    devices: dto.devices.map((device) => ({
      deviceId: device.device_id,
      region: device.region,
      modelName: device.model_name,
      firmwareVersion: device.firmware_version,
      coreRemainingDays: device.core_remaining_days,
      warrantyStatus: device.warranty_status,
      regionTds: device.region_tds,
      warrantyRemainingDays: device.warranty_remaining_days,
    })),
    loyaltyPoints: dto.loyalty_points,
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
