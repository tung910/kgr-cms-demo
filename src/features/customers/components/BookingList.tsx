import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@/shared/lib/format';

import type { Booking, BookingStatus } from '../mocks/customerMockData';

export interface BookingListProps {
  bookings: Booking[];
  onAssign: (id: string) => void;
  onComplete: (id: string) => void;
}

const statusColors: Record<BookingStatus, string> = {
  pending: 'default',
  assigned: 'blue',
  done: 'green',
};

export function BookingList({
  bookings,
  onAssign,
  onComplete,
}: BookingListProps) {
  const { t } = useTranslation('customers');

  const columns: ColumnsType<Booking> = [
    { title: t('booking.columns.id'), dataIndex: 'id', key: 'id' },
    {
      title: t('booking.columns.customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: t('booking.columns.deviceId'),
      dataIndex: 'deviceId',
      key: 'deviceId',
    },
    { title: t('booking.columns.issue'), dataIndex: 'issue', key: 'issue' },
    {
      title: t('booking.columns.scheduledAt'),
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t('booking.columns.technician'),
      dataIndex: 'technician',
      key: 'technician',
    },
    {
      title: t('booking.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => (
        <Tag color={statusColors[status]}>{t(`booking.status.${status}`)}</Tag>
      ),
    },
    {
      title: t('booking.columns.actions'),
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={record.status !== 'pending'}
            onClick={() => onAssign(record.id)}
          >
            {t('booking.assign')}
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={record.status !== 'assigned'}
            onClick={() => onComplete(record.id)}
          >
            {t('booking.complete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={bookings}
      pagination={false}
    />
  );
}
