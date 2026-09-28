import type { ReactNode } from 'react';

import { toneColors, type PortalTone } from './tone';

export interface PortalBadgeProps {
  tone?: PortalTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function PortalBadge({
  tone = 'primary',
  dot = false,
  children,
  className = '',
}: PortalBadgeProps) {
  const toneColor = toneColors[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
      style={{ backgroundColor: toneColor.bg, color: toneColor.fg }}
    >
      {dot ? (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: toneColor.fg }}
        />
      ) : null}
      {children}
    </span>
  );
}
