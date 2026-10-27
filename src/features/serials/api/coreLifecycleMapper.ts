import type {
  CoreLifecycleConfig,
  CoreLifecycleConfigDto,
  CoreType,
  CoreTypeDto,
} from '../schemas/coreLifecycleSchemas';

export function mapCoreType(dto: CoreTypeDto): CoreType {
  return {
    code: dto.code,
    name: dto.name,
    group: dto.group,
    usualPosition: dto.usual_position,
    standardMonths: dto.standard_months,
    standardHours: dto.standard_hours,
    floorPercent: dto.floor_percent,
  };
}

export function mapCoreLifecycleConfig(
  dto: CoreLifecycleConfigDto
): CoreLifecycleConfig {
  return {
    coreTypes: dto.core_types.map(mapCoreType),
    regionInsights: dto.region_insights.map((insight) => ({
      region: insight.region,
      avgTdsPpm: insight.avg_tds_ppm,
      earlyReplacePercent: insight.early_replace_percent,
    })),
    auditLog: dto.audit_log.map((entry) => ({
      id: entry.id,
      actor: entry.actor,
      changedAt: entry.changed_at,
      targetKind: entry.target_kind,
      target: entry.target,
      field: entry.field,
      beforeValue: entry.before_value,
      afterValue: entry.after_value,
      reason: entry.reason,
    })),
  };
}
