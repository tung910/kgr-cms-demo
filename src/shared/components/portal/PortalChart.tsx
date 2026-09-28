import type { ReactNode } from 'react';

import { PortalCard } from './PortalCard';

export interface PortalChartProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PortalChart({
  title,
  description,
  actions,
  children,
  className,
}: PortalChartProps) {
  return (
    <PortalCard
      className={className}
      title={
        <div>
          <div>{title}</div>
          {description ? (
            <p className="mb-0 mt-1 text-sm font-normal text-[#636466]">
              {description}
            </p>
          ) : null}
        </div>
      }
      actions={actions}
    >
      {children}
    </PortalCard>
  );
}
