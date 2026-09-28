import type { ReactNode } from 'react';

export interface PortalPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PortalPageHeader({
  title,
  description,
  actions,
}: PortalPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading m-0 text-2xl font-semibold tracking-tight text-[#020204] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mb-0 mt-1 text-sm text-[#636466] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
