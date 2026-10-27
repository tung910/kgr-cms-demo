import { Button, Pagination, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalBadge } from '@/shared/components/portal';
import { formatDate } from '@/shared/lib/format';
import type { PageResponse } from '@/shared/types/pagination';

import {
  PACKAGE_GROUP_TONE,
  PACKAGE_STATUS_TONE,
} from '../constants/servicePackage';
import type {
  ServicePackage,
  ServicePackageListFilters,
} from '../schemas/servicePackageSchemas';

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export interface ServicePackageTableProps {
  data: PageResponse<ServicePackage>;
  filters: ServicePackageListFilters;
  loading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onPublish: (servicePackage: ServicePackage) => void;
  onArchive: (servicePackage: ServicePackage) => void;
}

export function ServicePackageTable({
  data,
  filters,
  loading = false,
  onPageChange,
  onPublish,
  onArchive,
}: ServicePackageTableProps) {
  const { t } = useTranslation('servicePackages');

  const priceLabel = (servicePackage: ServicePackage): string => {
    if (servicePackage.price === 0) return t('table.price.free');
    const amount = vndFormatter.format(servicePackage.price);
    const period = servicePackage.billingPeriodMonths;
    if (period === null) return amount;
    const cadence =
      period === 1
        ? t('table.price.perMonth')
        : t('table.price.perMonths', { count: period });
    return `${amount} / ${cadence}`;
  };

  const columns: ColumnsType<ServicePackage> = [
    {
      title: t('table.columns.package'),
      key: 'package',
      render: (_, servicePackage) => (
        <div>
          <div className="text-[13px] font-semibold text-[#020204]">
            {servicePackage.name}
          </div>
          <div className="mt-1 font-mono text-xs text-[#636466]">
            {servicePackage.code}
          </div>
          {servicePackage.description ? (
            <div className="mt-1 max-w-xs text-xs text-[#9A9B9C]">
              {servicePackage.description}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: t('table.columns.group'),
      key: 'group',
      render: (_, servicePackage) => (
        <PortalBadge tone={PACKAGE_GROUP_TONE[servicePackage.group]} dot>
          {t(`groups.${servicePackage.group}`)}
        </PortalBadge>
      ),
    },
    {
      title: t('table.columns.billing'),
      key: 'billing',
      render: (_, servicePackage) => (
        <span className="text-xs text-[#636466]">
          {t(`billingTypes.${servicePackage.billingType}`)}
          {servicePackage.termMonths !== null ? (
            <div className="mt-0.5 text-[#9A9B9C]">
              {t('table.term.months', { count: servicePackage.termMonths })}
            </div>
          ) : null}
        </span>
      ),
    },
    {
      title: t('table.columns.price'),
      key: 'price',
      render: (_, servicePackage) => (
        <span className="whitespace-nowrap text-sm font-semibold text-[#020204]">
          {priceLabel(servicePackage)}
        </span>
      ),
    },
    {
      title: t('table.columns.eligibility'),
      key: 'eligibility',
      render: (_, servicePackage) => (
        <span className="text-xs text-[#636466]">
          {t('table.eligibleModels', {
            count: servicePackage.eligibleModelCount,
          })}
        </span>
      ),
    },
    {
      title: t('table.columns.status'),
      key: 'status',
      render: (_, servicePackage) => (
        <PortalBadge tone={PACKAGE_STATUS_TONE[servicePackage.status]}>
          {t(`statuses.${servicePackage.status}`)}
        </PortalBadge>
      ),
    },
    {
      title: t('table.columns.updatedAt'),
      key: 'updatedAt',
      render: (_, servicePackage) => (
        <span className="whitespace-nowrap text-xs text-[#636466]">
          {formatDate(servicePackage.updatedAt)}
        </span>
      ),
    },
    {
      title: t('table.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, servicePackage) => (
        <PermissionGuard capability="service_package.write">
          <Space size="small">
            {servicePackage.status === 'draft' ? (
              <Button
                type="link"
                size="small"
                onClick={() => onPublish(servicePackage)}
              >
                {t('actions.publish')}
              </Button>
            ) : null}
            {servicePackage.status !== 'archived' ? (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => onArchive(servicePackage)}
              >
                {t('actions.archive')}
              </Button>
            ) : null}
          </Space>
        </PermissionGuard>
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
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => t('table.totalPackages', { total }),
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
          {data.items.map((servicePackage) => (
            <div key={servicePackage.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#020204]">
                    {servicePackage.name}
                  </div>
                  <div className="mt-1 font-mono text-xs text-[#636466]">
                    {servicePackage.code}
                  </div>
                </div>
                <PortalBadge tone={PACKAGE_STATUS_TONE[servicePackage.status]}>
                  {t(`statuses.${servicePackage.status}`)}
                </PortalBadge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PortalBadge
                  tone={PACKAGE_GROUP_TONE[servicePackage.group]}
                  dot
                >
                  {t(`groups.${servicePackage.group}`)}
                </PortalBadge>
                <span className="text-sm font-semibold text-[#020204]">
                  {priceLabel(servicePackage)}
                </span>
              </div>
              <PermissionGuard capability="service_package.write">
                <div className="flex items-center justify-end gap-2 border-t border-[#E7E8E9] pt-2">
                  {servicePackage.status === 'draft' ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => onPublish(servicePackage)}
                    >
                      {t('actions.publish')}
                    </Button>
                  ) : null}
                  {servicePackage.status !== 'archived' ? (
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => onArchive(servicePackage)}
                    >
                      {t('actions.archive')}
                    </Button>
                  ) : null}
                </div>
              </PermissionGuard>
            </div>
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
