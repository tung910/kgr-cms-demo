import {
  DownloadOutlined,
  ExperimentOutlined,
  FilterOutlined,
  TeamOutlined,
  WalletOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from 'antd';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PortalChart,
  PortalEChart,
  PortalPageHeader,
  PortalStatCard,
  type PortalTone,
} from '@/shared/components/portal';
import { referenceColors } from '@/theme/tokens';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import {
  downloadRevenueCsv,
  downloadTdsCsv,
} from '../utils/exportDashboardCsv';
import { dashboardQueries } from '../queries/dashboardQueries';
import { ActiveUsageSection } from '../components/ActiveUsageSection';
import type {
  DashboardActiveFilters,
  DashboardRegionTds,
  DashboardRevenuePoint,
  DashboardSearch,
  DashboardSummary,
  DashboardTrendPoint,
} from '../schemas/dashboardSchemas';

const metricIcons = {
  total: <WifiOutlined />,
  errorRate: <WarningOutlined />,
  tds: <ExperimentOutlined />,
  active: <TeamOutlined />,
  filters: <FilterOutlined />,
  revenue: <WalletOutlined />,
} as const;

const metricTones: Record<keyof typeof metricIcons, PortalTone> = {
  total: 'primary',
  errorRate: 'warning',
  tds: 'info',
  active: 'info',
  filters: 'water',
  revenue: 'primary',
};

const axisLineStyle = { lineStyle: { color: referenceColors.border } };
const splitLineStyle = {
  splitLine: {
    lineStyle: { color: referenceColors.border, type: 'dashed' as const },
  },
};

function useOnlineTrendOption(
  points: readonly DashboardTrendPoint[]
): EChartsOption {
  const { t } = useTranslation('dashboard');
  return useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: {
        show: true,
        right: 0,
        top: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#636466', fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((point) => point.label),
        axisLine: axisLineStyle,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        ...splitLineStyle,
      },
      series: [
        {
          name: t('legend.online'),
          type: 'line',
          data: points.map((point) => point.online),
          smooth: 0.35,
          symbol: 'none',
          lineStyle: { color: referenceColors.primary, width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(5,134,66,0.22)' },
                { offset: 1, color: 'rgba(5,134,66,0)' },
              ],
            },
          },
        },
        {
          name: t('legend.offline'),
          type: 'line',
          data: points.map((point) => point.offline),
          smooth: 0.35,
          symbol: 'none',
          lineStyle: { color: '#636466', width: 2.5 },
        },
      ],
    }),
    [points, t]
  );
}

function useTdsByRegionOption(
  regions: readonly DashboardRegionTds[],
  threshold: number
): EChartsOption {
  return useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: regions.map((region) => region.region),
        axisLine: axisLineStyle,
        axisTick: { show: false },
        axisLabel: { interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        ...splitLineStyle,
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 32,
          data: regions.map((region) => ({
            value: region.tds,
            itemStyle: {
              color:
                region.tds > threshold
                  ? referenceColors.danger
                  : referenceColors.water,
              borderRadius: [6, 6, 0, 0],
            },
          })),
        },
      ],
    }),
    [regions, threshold]
  );
}

function useRevenueOption(
  points: readonly DashboardRevenuePoint[]
): EChartsOption {
  const { t } = useTranslation('dashboard');
  return useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: {
        show: true,
        right: 0,
        top: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#636466', fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: points.map((point) => point.label),
        axisLine: axisLineStyle,
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          axisLine: { show: false },
          ...splitLineStyle,
        },
        {
          type: 'value',
          axisLine: { show: false },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: t('legend.revenue'),
          type: 'bar',
          barMaxWidth: 36,
          yAxisIndex: 0,
          itemStyle: {
            color: referenceColors.primary,
            borderRadius: [6, 6, 0, 0],
          },
          data: points.map((point) => point.revenue),
        },
        {
          name: t('legend.filters'),
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: referenceColors.warning, width: 2.5 },
          itemStyle: { color: referenceColors.warning },
          data: points.map((point) => point.filters),
        },
      ],
    }),
    [points, t]
  );
}

const emptyOnlineTrend: DashboardTrendPoint[] = [];
const emptyTdsByRegion: DashboardRegionTds[] = [];
const emptyRevenueTrend: DashboardRevenuePoint[] = [];

export interface DashboardPageProps {
  search: DashboardSearch;
}

export function DashboardPage({ search }: DashboardPageProps) {
  const { t } = useTranslation('dashboard');

  const summary = useQuery(dashboardQueries.summary());
  const data: DashboardSummary | undefined = summary.data;
  const activeFilters: DashboardActiveFilters = {
    granularity: search.granularity ?? 'month',
    ...(search.from && { from: search.from }),
    ...(search.to && { to: search.to }),
  };

  const onlineTrendOption = useOnlineTrendOption(
    data?.onlineTrend ?? emptyOnlineTrend
  );
  const tdsOption = useTdsByRegionOption(
    data?.tdsByRegion ?? emptyTdsByRegion,
    data?.tdsThreshold ?? 0
  );
  const revenueOption = useRevenueOption(
    data?.revenueTrend ?? emptyRevenueTrend
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F4EC] px-3 py-1 text-xs font-semibold text-[#058642]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#058642]" />
            {t('page.realtimeTag')}
          </span>
        }
      />
      {summary.isError ? (
        <Alert
          type="error"
          showIcon
          message={t('errors.loadFailed')}
          description={summary.error.message}
        />
      ) : null}
      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 2 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {(data?.metrics ?? []).map((metric) => (
            <PortalStatCard
              key={metric.key}
              label={t(`metrics.${metric.key}`)}
              value={metric.value}
              unit={metric.unit}
              icon={metricIcons[metric.key]}
              tone={metricTones[metric.key]}
              trend={{
                direction: metric.trend.direction,
                label: metric.trend.percent,
                positiveIsGood: metric.trend.positiveIsGood,
              }}
            />
          ))}
        </div>
      )}
      <PortalChart
        title={t('charts.onlineTrend.title')}
        description={t('charts.onlineTrend.description')}
      >
        <PortalEChart
          option={onlineTrendOption}
          ariaLabel={t('charts.onlineTrend.ariaLabel')}
        />
      </PortalChart>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PortalChart
          title={t('charts.tds.title')}
          description={t('charts.tds.description', {
            threshold: data?.tdsThreshold ?? 0,
          })}
          actions={
            <PermissionGuard capability="dashboard.tds.export">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                disabled={!data}
                onClick={() =>
                  data && downloadTdsCsv(data.tdsByRegion, data.tdsThreshold)
                }
              >
                {t('actions.exportExcel')}
              </Button>
            </PermissionGuard>
          }
        >
          <PortalEChart option={tdsOption} ariaLabel={t('charts.tds.title')} />
        </PortalChart>
        <PortalChart
          title={t('charts.revenue.title')}
          description={t('charts.revenue.description')}
          actions={
            <PermissionGuard capability="dashboard.revenue.export">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                disabled={!data}
                onClick={() => data && downloadRevenueCsv(data.revenueTrend)}
              >
                {t('actions.exportExcel')}
              </Button>
            </PermissionGuard>
          }
        >
          <PortalEChart
            option={revenueOption}
            ariaLabel={t('charts.revenue.ariaLabel')}
          />
        </PortalChart>
      </div>
      <PermissionGuard capability="dashboard.active.read">
        <ActiveUsageSection filters={activeFilters} />
      </PermissionGuard>
    </div>
  );
}
