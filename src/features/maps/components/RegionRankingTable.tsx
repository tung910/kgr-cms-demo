import { Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { PortalBadge } from '@/shared/components/portal';

import type { MapRegion } from '../schemas/mapSchemas';

export interface RegionRankingTableProps {
  regions: MapRegion[];
  tdsThreshold: number;
  selectedRegionId?: string;
  onSelectRegion: (id: string) => void;
}

export function RegionRankingTable({
  regions,
  tdsThreshold,
  selectedRegionId,
  onSelectRegion,
}: RegionRankingTableProps) {
  const { t } = useTranslation('maps');
  const ranked = [...regions]
    .filter((region) => region.level === 'province')
    .sort((a, b) => b.deviceCount - a.deviceCount);

  const columns: ColumnsType<MapRegion> = [
    {
      title: t('ranking.columns.rank'),
      width: 56,
      render: (_value, _region, index) => index + 1,
    },
    { title: t('ranking.columns.region'), dataIndex: 'name' },
    {
      title: t('ranking.columns.devices'),
      dataIndex: 'deviceCount',
      align: 'right',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: t('ranking.columns.avgTds'),
      dataIndex: 'avgTds',
      align: 'right',
      render: (tds: number) =>
        tds > tdsThreshold ? (
          <Tooltip
            title={t('ranking.overThreshold', { threshold: tdsThreshold })}
          >
            <span className="font-semibold text-[#D9131F]">
              <WarningOutlined /> {tds}
            </span>
          </Tooltip>
        ) : (
          tds
        ),
    },
    {
      title: t('ranking.columns.status'),
      dataIndex: 'status',
      render: (status: MapRegion['status']) => (
        <PortalBadge tone={status === 'warning' ? 'danger' : 'primary'}>
          {t(`mapRegionStatus.${status}`, { ns: 'common' })}
        </PortalBadge>
      ),
    },
  ];

  return (
    <Table<MapRegion>
      size="middle"
      rowKey="id"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={columns}
      dataSource={ranked}
      rowClassName={(region) =>
        region.id === selectedRegionId ? 'bg-[#F0F6FF]' : ''
      }
      onRow={(region) => ({
        onClick: () => onSelectRegion(region.id),
        className: 'cursor-pointer',
      })}
    />
  );
}
