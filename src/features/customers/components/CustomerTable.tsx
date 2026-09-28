import { Link } from '@tanstack/react-router';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { Customer, WarrantyStatus } from '../mocks/customerMockData';

export interface CustomerTableProps {
  customers: Customer[];
}

const warrantyColors: Record<WarrantyStatus, string> = {
  active: 'green',
  expiring: 'orange',
  expired: 'red',
};

export function CustomerTable({ customers }: CustomerTableProps) {
  const { t } = useTranslation('customers');

  const columns: ColumnsType<Customer> = [
    { title: t('table.columns.id'), dataIndex: 'id', key: 'id' },
    { title: t('table.columns.name'), dataIndex: 'name', key: 'name' },
    { title: t('table.columns.phone'), dataIndex: 'phone', key: 'phone' },
    { title: t('table.columns.region'), dataIndex: 'region', key: 'region' },
    {
      title: t('table.columns.deviceCount'),
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      render: (count: number, customer: Customer) => (
        <PermissionGuard capability="device.read" fallback={count}>
          <Link
            to="/devices"
            search={{
              search: '',
              customerId: customer.id,
              page: 1,
              pageSize: 10,
            }}
          >
            {count}
          </Link>
        </PermissionGuard>
      ),
    },
    {
      title: t('table.columns.warrantyStatus'),
      dataIndex: 'warrantyStatus',
      key: 'warrantyStatus',
      render: (status: WarrantyStatus) => (
        <Tag color={warrantyColors[status]}>{t(`warranty.${status}`)}</Tag>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      onRow={(customer) => ({ id: customer.id })}
      columns={columns}
      dataSource={customers}
      pagination={{ pageSize: 10 }}
    />
  );
}
