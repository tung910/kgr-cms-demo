import type {
  DashboardMetric,
  DashboardMetricDto,
  DashboardMetricKey,
  DashboardSummary,
  DashboardSummaryDto,
} from '../schemas/dashboardSchemas';

const metricKeyByDto: Record<DashboardMetricDto['key'], DashboardMetricKey> = {
  total: 'total',
  error_rate: 'errorRate',
  tds: 'tds',
  active: 'active',
  filters: 'filters',
  revenue: 'revenue',
};

function mapMetric(dto: DashboardMetricDto): DashboardMetric {
  return {
    key: metricKeyByDto[dto.key],
    value: dto.value,
    ...(dto.unit && { unit: dto.unit }),
    trend: {
      direction: dto.trend.direction,
      percent: dto.trend.percent,
      positiveIsGood: dto.trend.positive_is_good,
    },
  };
}

export function mapDashboardSummary(
  dto: DashboardSummaryDto
): DashboardSummary {
  return {
    updatedAt: dto.updated_at,
    metrics: dto.metrics.map(mapMetric),
    onlineTrend: dto.online_trend,
    tdsByRegion: dto.tds_by_region,
    tdsThreshold: dto.tds_threshold,
    revenueTrend: dto.revenue_trend,
  };
}
