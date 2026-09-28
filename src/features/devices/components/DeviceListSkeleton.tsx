import { Skeleton } from 'antd';

import { PortalCard } from '@/shared/components/portal';

const statCardCount = 4;
const rowCount = 8;

export function DeviceListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="w-full max-w-md space-y-2">
          <Skeleton.Input active size="large" block />
          <Skeleton.Input active size="small" className="w-2/3" />
        </div>
        <Skeleton.Button active />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: statCardCount }, (_, index) => (
          <PortalCard key={index}>
            <Skeleton.Avatar active shape="square" size={40} />
            <Skeleton active title={false} paragraph={{ rows: 2 }} />
          </PortalCard>
        ))}
      </div>
      <PortalCard padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-[#E7E8E9] p-4">
          <Skeleton.Input active className="w-full sm:flex-1" block />
          <Skeleton.Input active />
          <Skeleton.Input active />
          <Skeleton.Button active />
        </div>
        <div className="divide-y divide-[#E7E8E9]">
          {Array.from({ length: rowCount }, (_, index) => (
            <div key={index} className="p-4">
              <Skeleton active title={false} paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
