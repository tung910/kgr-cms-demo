import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { LegacyGridContainLabel } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';

import { referenceColors } from '@/theme/tokens';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  LegacyGridContainLabel,
  SVGRenderer,
]);

export interface PortalEChartProps {
  option: EChartsOption;
  height?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const baseTextStyle = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: referenceColors.border,
};

/** Shared ECharts wrapper: applies the portal's neutral grid/axis/tooltip defaults. */
export function PortalEChart({
  option,
  height = 260,
  className,
  style,
  ariaLabel,
}: PortalEChartProps) {
  const merged = useMemo<EChartsOption>(
    () => ({
      textStyle: baseTextStyle,
      grid: { left: 8, right: 8, top: 12, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#020204',
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        axisPointer: { type: 'line', lineStyle: { color: '#E7E8E9' } },
      },
      ...option,
    }),
    [option]
  );

  return (
    <div role="img" aria-label={ariaLabel} className={className}>
      <ReactEChartsCore
        echarts={echarts}
        option={merged}
        style={{ height, width: '100%', ...style }}
        notMerge
        lazyUpdate
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
