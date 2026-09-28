import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Segmented, Spin } from 'antd';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';

import { PortalCard, PortalEChart } from '@/shared/components/portal';
import { referenceColors } from '@/theme/tokens';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type { TelemetryRange } from '../schemas/deviceDetailSchemas';

const ranges: TelemetryRange[] = ['24h', '7d', '30d'];

// §3.4 — TDS in/out over the selected window. The range is local view state,
// not shareable page state.
export function DeviceTelemetryPanel({ device }: { device: Device }) {
  const { t, i18n } = useTranslation('devices');
  const [range, setRange] = useState<TelemetryRange>('24h');
  const history = useQuery(deviceQueries.telemetryHistory(device.id, range));

  const option = useMemo<EChartsOption>(() => {
    const points = history.data ?? [];
    const timeFormat = new Intl.DateTimeFormat(
      i18n.resolvedLanguage,
      range === '24h'
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit' }
    );
    const series = [
      {
        color: referenceColors.warning,
        name: t('telemetry.series.tdsIn'),
        values: points.map((point) => point.tdsInPpm),
      },
      {
        name: t('telemetry.series.tdsOut'),
        color: referenceColors.water,
        values: points.map((point) => point.tdsOutPpm),
      },
    ];
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) =>
          typeof value === 'number' ? `${value} ${t('telemetry.unit')}` : '—',
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#020204', fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((point) =>
          timeFormat.format(new Date(point.measuredAt))
        ),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#636466', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: t('telemetry.unit'),
        nameTextStyle: { color: '#636466', fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', color: '#E7E8E9' } },
        axisLabel: { color: '#636466', fontSize: 11 },
      },
      series: series.map((item) => ({
        type: 'line',
        name: item.name,
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: item.values,
        itemStyle: { color: item.color },
        lineStyle: { width: 2, color: item.color },
      })),
    };
  }, [history.data, i18n.resolvedLanguage, range, t]);

  return (
    <PortalCard
      className="h-full"
      title={
        <div>
          <div>{t('telemetry.title')}</div>
          <p className="m-0 text-xs font-normal text-[#636466]">
            {t('telemetry.description')}
          </p>
        </div>
      }
      actions={
        <Segmented<TelemetryRange>
          size="small"
          value={range}
          options={ranges.map((value) => ({
            value,
            label: t('telemetry.ranges.' + value),
          }))}
          onChange={setRange}
        />
      }
    >
      {history.isPending ? (
        <div className="flex h-[260px] items-center justify-center">
          <Spin />
        </div>
      ) : history.isError ? (
        <p className="m-0 flex h-[260px] items-center justify-center text-sm text-[#636466]">
          {t('telemetry.error')}
        </p>
      ) : history.data.length === 0 ? (
        <p className="m-0 flex h-[260px] items-center justify-center text-sm text-[#636466]">
          {t('telemetry.empty')}
        </p>
      ) : (
        <PortalEChart
          option={option}
          height={320}
          ariaLabel={t('telemetry.title')}
        />
      )}
    </PortalCard>
  );
}
