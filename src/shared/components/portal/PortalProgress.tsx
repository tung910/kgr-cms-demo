import { toneColors, type PortalTone } from './tone';

export interface PortalProgressProps {
  value: number;
  max: number;
  tone?: PortalTone;
  className?: string;
}

export function PortalProgress({
  value,
  max,
  tone = 'primary',
  className = '',
}: PortalProgressProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-2.5 rounded-full bg-[#F3F4F4] ${className}`}>
      <div
        className="h-full rounded-full"
        style={{ width: `${percent}%`, backgroundColor: toneColors[tone].fg }}
      />
    </div>
  );
}
