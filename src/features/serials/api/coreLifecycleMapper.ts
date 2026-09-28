import type {
  CoreLifecycleCampaign,
  CoreLifecycleCampaignDto,
  CoreLifecycleConfig,
  CoreLifecycleConfigDto,
  CoreModelLayout,
  CoreModelLayoutDto,
  CoreSku,
  CoreSkuDto,
} from '../schemas/coreLifecycleSchemas';

export function mapCoreLifecycleConfig(
  dto: CoreLifecycleConfigDto
): CoreLifecycleConfig {
  return {
    cores: dto.cores.map((core) => ({
      sku: core.sku,
      name: core.name,
      kind: core.kind,
      lifespanMonths: core.lifespan_months,
      lifespanLiters: core.lifespan_liters,
      warningLevel1Percent: core.warning_level1_percent,
      warningLevel2Percent: core.warning_level2_percent,
      ...(core.guide_video_url && { guideVideoUrl: core.guide_video_url }),
      saleRegions: core.sale_regions,
      tdsFactors: core.tds_factors.map((item) => ({
        minPpm: item.min_ppm,
        ...(item.max_ppm !== undefined && { maxPpm: item.max_ppm }),
        factor: item.factor,
      })),
    })),
    modelLayouts: dto.model_layouts.map((layout) => ({
      modelId: layout.model_id,
      positions: layout.positions.map((position) => ({
        position: position.position,
        name: position.name,
        compatibleSkus: position.compatible_skus,
        defaultSku: position.default_sku,
      })),
    })),
    campaigns: dto.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      ...(campaign.sku && { sku: campaign.sku }),
      ...(campaign.region && { region: campaign.region }),
      pushContent: campaign.push_content,
      ctaLabel: campaign.cta_label,
      deeplink: campaign.deeplink,
      startsAt: campaign.starts_at,
      endsAt: campaign.ends_at,
    })),
    auditLog: dto.audit_log.map((entry) => ({
      id: entry.id,
      actor: entry.actor,
      changedAt: entry.changed_at,
      field: entry.field,
      beforeValue: entry.before_value,
      afterValue: entry.after_value,
    })),
  };
}

export function mapCoresToDto(cores: CoreSku[]): CoreSkuDto[] {
  return cores.map((core) => ({
    sku: core.sku,
    name: core.name,
    kind: core.kind,
    lifespan_months: core.lifespanMonths,
    lifespan_liters: core.lifespanLiters,
    warning_level1_percent: core.warningLevel1Percent,
    warning_level2_percent: core.warningLevel2Percent,
    ...(core.guideVideoUrl && { guide_video_url: core.guideVideoUrl }),
    sale_regions: core.saleRegions,
    tds_factors: core.tdsFactors.map((item) => ({
      min_ppm: item.minPpm,
      ...(item.maxPpm !== undefined && { max_ppm: item.maxPpm }),
      factor: item.factor,
    })),
  }));
}

export function mapModelLayoutsToDto(
  layouts: CoreModelLayout[]
): CoreModelLayoutDto[] {
  return layouts.map((layout) => ({
    model_id: layout.modelId,
    positions: layout.positions.map((position) => ({
      position: position.position,
      name: position.name,
      compatible_skus: position.compatibleSkus,
      default_sku: position.defaultSku,
    })),
  }));
}

export function mapCampaignsToDto(
  campaigns: CoreLifecycleCampaign[]
): CoreLifecycleCampaignDto[] {
  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    ...(campaign.sku && { sku: campaign.sku }),
    ...(campaign.region && { region: campaign.region }),
    push_content: campaign.pushContent,
    cta_label: campaign.ctaLabel,
    deeplink: campaign.deeplink,
    starts_at: campaign.startsAt,
    ends_at: campaign.endsAt,
  }));
}
