import type { ReactNode } from 'react';

export interface PortalCardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
}

export function PortalCard({
  children,
  className = '',
  title,
  actions,
  padded = true,
}: PortalCardProps) {
  return (
    <section
      className={`shadow-soft rounded-2xl border border-[#E7E8E9] bg-white ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <div className="text-base font-semibold text-[#020204]">
              {title}
            </div>
          ) : (
            <span />
          )}
          {actions ? (
            <div className="flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
