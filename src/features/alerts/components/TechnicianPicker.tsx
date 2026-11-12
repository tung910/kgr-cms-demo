import { useQuery } from '@tanstack/react-query';
import { Table, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageState } from '@/shared/components/PageState';
import { alertQueries } from '../queries/alertQueries';
import type { TechnicianSuggestionParams } from '../schemas/alertSchemas';

export function TechnicianPicker({
  params,
  value,
  onChange,
}: {
  params: TechnicianSuggestionParams;
  value?: string;
  onChange: (technicianId: string) => void;
}) {
  const { t } = useTranslation('alerts');
  const { data, isLoading } = useQuery(
    alertQueries.technicianSuggestions(params)
  );
  if (isLoading) return <PageState kind="loading" />;
  if (!data?.technicians.length)
    return <PageState kind="empty" description={t('technician.empty')} />;
  return (
    <div>
      <div className="mb-3 text-sm font-semibold">
        {t('technician.station', { name: data.station.name })}
      </div>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={data.technicians}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: value ? [value] : [],
          getCheckboxProps: (item) => ({
            disabled:
              !item.freeInSlot ||
              (params.serviceType === 'repair' && item.specialty !== 'repair'),
          }),
          onChange: (keys) => keys[0] && onChange(String(keys[0])),
        }}
        columns={[
          {
            title: t('technician.name'),
            dataIndex: 'name',
            render: (name, item) => {
              const reason = !item.freeInSlot
                ? t('technician.busy')
                : params.serviceType === 'repair' && item.specialty !== 'repair'
                  ? t('technician.specialtyMismatch')
                  : undefined;
              return reason ? (
                <Tooltip title={reason}>
                  <span className="text-brand-gray">{name}</span>
                </Tooltip>
              ) : (
                name
              );
            },
          },
          {
            title: t('technician.specialty'),
            dataIndex: 'specialty',
            render: (value) => t(`specialty.${value}`),
          },
          {
            title: t('technician.free'),
            dataIndex: 'freeInSlot',
            render: (value) => t(value ? 'technician.yes' : 'technician.no'),
          },
          { title: t('technician.ticketsToday'), dataIndex: 'ticketsToday' },
          { title: t('technician.rating'), dataIndex: 'rating' },
        ]}
      />
    </div>
  );
}
