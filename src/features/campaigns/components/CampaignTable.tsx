import { Pagination, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import type { Campaign, CampaignListFilters } from '../schemas/campaignSchemas';
import { CampaignStatusTag } from './CampaignStatusTag';
import { PromotedPackageWarning } from './PromotedPackageWarning';

export interface CampaignTableProps {
  data: PageResponse<Campaign>;
  filters: CampaignListFilters;
  loading?: boolean;
  onOpen: (id: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export function CampaignTable({
  data,
  filters,
  loading = false,
  onOpen,
  onPageChange,
}: CampaignTableProps) {
  const { t } = useTranslation('campaigns');

  const scheduleLabel = (campaign: Campaign) => {
    if (campaign.kind === 'trigger') return t('kind.trigger');
    if (campaign.scheduleType === 'send_now') return t('schedule.send_now');
    return campaign.startsAt
      ? formatDateTime(campaign.startsAt)
      : t('schedule.scheduled');
  };

  const columns: ColumnsType<Campaign> = [
    {
      title: t('table.columns.campaign'),
      key: 'campaign',
      render: (_: unknown, campaign) => (
        <div>
          <div className="text-[13px] font-semibold text-[#020204]">
            {campaign.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#636466]">
            <span>{campaign.id}</span>
            <Tag className="m-0">{t(`kind.${campaign.kind}`)}</Tag>
            <Tag className="m-0">
              {t(`displayType.${campaign.displayType}`)}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: t('table.columns.status'),
      key: 'status',
      render: (_: unknown, campaign) => (
        <div className="max-w-[260px] min-w-0 space-y-1">
          <CampaignStatusTag status={campaign.status} />
          <PromotedPackageWarning campaign={campaign} />
        </div>
      ),
    },
    {
      title: t('table.columns.audience'),
      key: 'audience',
      render: (_: unknown, campaign) => (
        <span className="tabular-nums">
          {campaign.audienceCount === null
            ? '—'
            : t('table.audienceCount', { count: campaign.audienceCount })}
        </span>
      ),
    },
    {
      title: t('table.columns.schedule'),
      key: 'schedule',
      render: (_: unknown, campaign) => (
        <span className="whitespace-nowrap text-xs text-[#636466]">
          {scheduleLabel(campaign)}
        </span>
      ),
    },
    {
      title: t('table.columns.updatedAt'),
      key: 'updatedAt',
      render: (_: unknown, campaign) => (
        <span className="whitespace-nowrap text-xs text-[#636466]">
          {formatDateTime(campaign.updatedAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="hidden pb-2 lg:block">
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          scroll={{ x: 'max-content' }}
          onRow={(campaign) => ({
            onClick: () => onOpen(campaign.id),
            className: 'cursor-pointer',
          })}
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => t('table.total', { total }),
            onChange: onPageChange,
          }}
        />
      </div>
      <div className="lg:hidden">
        <div
          aria-busy={loading}
          className={`divide-y divide-[#E7E8E9] transition-opacity ${
            loading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {data.items.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => onOpen(campaign.id)}
              className="block w-full space-y-3 p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Typography.Text strong>{campaign.name}</Typography.Text>
                  <div className="mt-1 text-xs text-[#636466]">
                    {campaign.id} · {t(`kind.${campaign.kind}`)}
                  </div>
                </div>
                <CampaignStatusTag status={campaign.status} />
              </div>
              <PromotedPackageWarning campaign={campaign} />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E8E9] pt-3 text-xs text-[#636466]">
                <span>
                  {campaign.audienceCount === null
                    ? '—'
                    : t('table.audienceCount', {
                        count: campaign.audienceCount,
                      })}
                </span>
                <span>{formatDateTime(campaign.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-center border-t border-[#E7E8E9] p-4">
          <Pagination
            simple
            current={filters.page}
            pageSize={filters.pageSize}
            total={data.total}
            showSizeChanger={false}
            onChange={onPageChange}
          />
        </div>
      </div>
    </>
  );
}
