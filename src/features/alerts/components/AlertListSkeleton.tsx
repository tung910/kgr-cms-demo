import { Skeleton } from 'antd';
import { PortalCard } from '@/shared/components/portal';

export function AlertListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton active paragraph={{ rows: 2 }} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <PortalCard key={index}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </PortalCard>
        ))}
      </div>
      <PortalCard>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PortalCard>
    </div>
  );
}
