import type {
  MapRegion,
  MapRegionDetail,
  MapRegionDetailDto,
  MapRegionDto,
  MapRegions,
  MapRegionsDto,
  MapSummary,
  MapSummaryDto,
} from '../schemas/mapSchemas';

export function mapRegion(dto: MapRegionDto): MapRegion {
  return {
    id: dto.id,
    name: dto.name,
    level: dto.level,
    parentId: dto.parent_id,
    lat: dto.lat,
    lng: dto.lng,
    deviceCount: dto.device_count,
    avgTds: dto.avg_tds,
    status: dto.status,
    insight: dto.insight,
  };
}

export function mapRegions(dto: MapRegionsDto): MapRegions {
  return {
    regions: dto.regions.map(mapRegion),
    tdsThreshold: dto.tds_threshold,
    models: dto.models,
    exactLocation: dto.exact_location,
  };
}

export function mapRegionDetail(dto: MapRegionDetailDto): MapRegionDetail {
  return { ...mapRegion(dto), sites: dto.sites };
}

export function mapSummary(dto: MapSummaryDto): MapSummary {
  return {
    totalDevices: dto.total_devices,
    regionCount: dto.region_count,
    alertRegionCount: dto.alert_region_count,
    avgTds: dto.avg_tds,
  };
}
