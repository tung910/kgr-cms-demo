import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, DatePicker, Segmented } from 'antd';
import dayjs from 'dayjs';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalChart, PortalEChart } from '@/shared/components/portal';
import { referenceColors } from '@/theme/tokens';

import { dashboardQueries } from '../queries/dashboardQueries';
import {
  ACTIVE_GRANULARITIES,
  type ActiveGranularity,
  type DashboardActiveFilters,
  type DashboardActivePoint,
} from '../schemas/dashboardSchemas';
import { downloadActiveCsv } from '../utils/exportDashboardCsv';

const isoDateFormat = 'YYYY-MM-DD';
const emptyPoints: DashboardActivePoint[] = [];

function useActiveBarOption(
  points: readonly DashboardActivePoint[],
  key: 'customers' | 'devices',
  color: string
): EChartsOption {
  return useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: points.map((point) => point.label),
        axisLine: { lineStyle: { color: referenceColors.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: referenceColors.border, type: 'dashed' },
        },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 28,
          itemStyle: { color, borderRadius: [6, 6, 0, 0] },
          data: points.map((point) => point[key]),
        },
      ],
    }),
    [points, key, color]
  );
}

export interface ActiveUsageSectionProps {
  filters: DashboardActiveFilters;
}

export function ActiveUsageSection({ filters }: ActiveUsageSectionProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate({ from: '/' });
  const active = useQuery(dashboardQueries.active(filters));
  const points = active.data ?? emptyPoints;
  const customersOption = useActiveBarOption(
    points,
    'customers',
    referenceColors.info
  );
  const devicesOption = useActiveBarOption(
    points,
    'devices',
    referenceColors.primary
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold">{t('active.title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<ActiveGranularity>
            aria-label={t('active.granularityAriaLabel')}
            value={filters.granularity}
            options={ACTIVE_GRANULARITIES.map((value) => ({
              value,
              label: t(`active.granularity.${value}`),
            }))}
            // A new granularity changes the picker type, so drop the range.
            onChange={(granularity) =>
              void navigate({ search: () => ({ granularity }) })
            }
          />
          <DatePicker.RangePicker
            picker={filters.granularity}
            aria-label={t('active.rangeAriaLabel')}
            value={
              filters.from && filters.to
                ? [dayjs(filters.from), dayjs(filters.to)]
                : null
            }
            onChange={(dates) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  from: dates?.[0]
                    ?.startOf(filters.granularity)
                    .format(isoDateFormat),
                  to: dates?.[1]
                    ?.endOf(filters.granularity)
                    .format(isoDateFormat),
                }),
              })
            }
          />
          <PermissionGuard capability="dashboard.active.export">
            <Button
              icon={<DownloadOutlined />}
              disabled={points.length === 0 || active.isError}
              onClick={() => downloadActiveCsv(points, filters.granularity)}
            >
              {t('actions.exportFile')}
            </Button>
          </PermissionGuard>
        </div>
      </div>
      {active.isError ? (
        <Alert
          type="error"
          showIcon
          message={t('errors.activeLoadFailed')}
          description={active.error.message}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PortalChart
          title={t('active.customers.title')}
          description={t('active.customers.description')}
        >
          <PortalEChart
            option={customersOption}
            ariaLabel={t('active.customers.title')}
          />
        </PortalChart>
        <PortalChart
          title={t('active.devices.title')}
          description={t('active.devices.description')}
        >
          <PortalEChart
            option={devicesOption}
            ariaLabel={t('active.devices.title')}
          />
        </PortalChart>
      </div>
    </section>
  );
}
