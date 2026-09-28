import type { ReactNode } from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

import { PortalCard } from './PortalCard';
import { toneColors, type PortalTone } from './tone';

export interface PortalStatCardTrend {
  direction: 'up' | 'down';
  label: string;
  /** Whether an increase is favourable; flips the trend badge color. Default true. */
  positiveIsGood?: boolean;
}

export interface PortalStatCardProps {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: PortalTone;
  trend?: PortalStatCardTrend;
  className?: string;
}

export function PortalStatCard({
  label,
  value,
  unit,
  detail,
  icon,
  tone = 'primary',
  trend,
  className,
}: PortalStatCardProps) {
  const toneColor = toneColors[tone];
  const trendIsUp = trend?.direction === 'up';
  const trendIsGood = trend
    ? (trend.positiveIsGood ?? true) === trendIsUp
    : true;
  const trendColor = trendIsGood ? toneColors.primary : toneColors.danger;

  return (
    <PortalCard className={className} padded>
      <div className="flex items-start justify-between gap-2">
        {icon ? (
          <div
            className="flex size-10 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: toneColor.bg, color: toneColor.fg }}
          >
            {icon}
          </div>
        ) : (
          <span />
        )}
        {trend ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
            style={{ backgroundColor: trendColor.bg, color: trendColor.fg }}
          >
            {trendIsUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {trend.label}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-[#020204]">
        {value}
        {unit ? (
          <span className="text-sm font-medium text-[#636466]">{unit}</span>
        ) : null}
      </div>
      <p className="m-0 mt-1 text-sm text-[#636466]">{label}</p>
      {detail ? (
        <div className="mt-2 text-xs text-[#B7B7B7]">{detail}</div>
      ) : null}
    </PortalCard>
  );
}
