import type { PageResponse } from '@/shared/types/pagination';

import type {
  AudienceCustomer,
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
  PromotedPackage,
  PromotedPackageDto,
} from '../schemas/campaignSchemas';

export function mapPromotedPackage(dto: PromotedPackageDto): PromotedPackage {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    group: dto.group,
    status: dto.status,
    grantable: dto.grantable,
    billingType: dto.billing_type,
    price: dto.price,
    billingPeriodMonths: dto.billing_period_months,
    pricingMode: dto.pricing_mode,
    termMonths: dto.term_months,
  };
}

export function mapCampaign(dto: CampaignDto): Campaign {
  return {
    id: dto.id,
    tenantId: dto.tenant_id,
    priority: dto.priority,
    name: dto.name,
    kind: dto.kind,
    displayType: dto.display_type,
    notificationGroup: dto.notification_group,
    title: dto.title,
    content: dto.content,
    buttons: dto.buttons,
    scheduleType: dto.schedule_type,
    startsAt: dto.starts_at,
    endsAt: dto.ends_at,
    status: dto.status,
    triggerPreset: dto.trigger_preset,
    triggerConfig: dto.trigger_config,
    frequencyCapPerCustomer: dto.frequency_cap_per_customer,
    audience: dto.audience,
    dedupe: dto.dedupe,
    suppression: dto.suppression,
    audienceCount: dto.audience_count,
    abTest: dto.ab_test,
    offer: dto.offer,
    promotedPackageId: dto.promoted_package_id,
    promotedPackage: dto.promoted_package
      ? mapPromotedPackage(dto.promoted_package)
      : null,
    testRecipients: dto.test_recipients,
    createdBy: dto.created_by,
    createdByName: dto.created_by_name,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    approverId: dto.approver_id,
    approverName: dto.approver_name,
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
    orders: dto.orders,
    revenue: dto.revenue,
    suppressedOptOut: dto.suppressed_opt_out,
    packagePurchases: dto.package_purchases,
    packageRevenue: dto.package_revenue,
  };
}

export function mapAudienceCustomer(
  dto: AudiencePreviewDto['sample'][number]
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
      usageType: device.usage_type,
      connectivity: device.connectivity,
      lastCorePurchaseDaysAgo: device.last_core_purchase_days_ago,
    })),
    loyaltyPoints: dto.loyalty_points,
    optIn: dto.opt_in,
  };
}

export function mapAudiencePreview(dto: AudiencePreviewDto): AudiencePreview {
  return {
    total: dto.total,
    eligible: dto.eligible,
    matched: dto.matched,
    matchedNonIot: dto.matched_non_iot,
    sample: dto.sample.map(mapAudienceCustomer),
    piiMasked: dto.pii_masked,
  };
}
