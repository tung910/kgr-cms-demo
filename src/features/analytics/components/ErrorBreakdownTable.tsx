import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { ErrorBreakdown } from '../mocks/analyticsMockData';

export interface ErrorBreakdownTableProps {
  errors: ErrorBreakdown[];
}

interface ErrorBreakdownRow extends ErrorBreakdown {
  percentage: number;
}

export function ErrorBreakdownTable({ errors }: ErrorBreakdownTableProps) {
  const { t } = useTranslation('analytics');
  const totalErrors = errors.reduce((sum, item) => sum + item.count, 0);

  const rows: ErrorBreakdownRow[] = errors.map((item) => ({
    ...item,
    percentage:
      totalErrors === 0 ? 0 : Math.round((item.count / totalErrors) * 100),
  }));

  const columns: ColumnsType<ErrorBreakdownRow> = [
    { title: t('table.columns.code'), dataIndex: 'code', key: 'code' },
    { title: t('table.columns.label'), dataIndex: 'label', key: 'label' },
    { title: t('table.columns.count'), dataIndex: 'count', key: 'count' },
    {
      title: t('table.columns.percentage'),
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => `${value}%`,
    },
  ];

  return (
    <Table
      rowKey="code"
      columns={columns}
      dataSource={rows}
      pagination={false}
    />
  );
}
