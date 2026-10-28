import { Skeleton } from 'antd';

import { PortalCard } from '@/shared/components/portal';

const statCardCount = 4;

export function MapSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="w-full max-w-md space-y-2">
        <Skeleton.Input active size="large" block />
        <Skeleton.Input active size="small" className="w-2/3" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: statCardCount }, (_, index) => (
          <PortalCard key={index}>
            <Skeleton active title={false} paragraph={{ rows: 2 }} />
          </PortalCard>
        ))}
      </div>
      <PortalCard padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-[#E7E8E9] p-4">
          <Skeleton.Input active />
          <Skeleton.Input active />
        </div>
        <div className="p-4">
          <Skeleton.Node active className="!h-96 !w-full" />
        </div>
      </PortalCard>
    </div>
  );
}
