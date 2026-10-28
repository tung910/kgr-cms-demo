import { useState } from 'react';
import { Button, Input, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import type {
  InventoryImportPackageOption,
  InventoryImportPreview,
} from '../schemas/inventoryImportSchemas';
import {
  inventoryImportBenefits,
  resolveInventoryPackages,
} from '../utils/inventoryImportSelection';

interface Props {
  items: InventoryImportPreview['items'];
  options: InventoryImportPackageOption[];
  common: string[];
  overrides: Record<string, string[]>;
  onChange: (rowId: string, ids: string[]) => void;
  onReset: (rowId: string) => void;
  mode: 'serials' | 'edit' | 'review';
  disabled?: boolean;
}

export function InventoryImportDeviceTable({
  items,
  options,
  common,
  overrides,
  onChange,
  onReset,
  mode,
  disabled,
}: Props) {
  const { t } = useTranslation('devices');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = items.filter((row) =>
    `${row.serial} ${row.model}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  );
  const columns: ColumnsType<InventoryImportPreview['items'][number]> = [
    {
      title: t('inventory.import.serial'),
      key: 'identity',
      width: 200,
      render: (_, row) => (
        <div>
          <span className="font-mono text-sm">{row.serial}</span>
          <div className="mt-1 text-xs text-[#636466]">{row.model}</div>
        </div>
      ),
    },
  ];
  if (mode !== 'serials')
    columns.push(
      {
        title: t('inventory.import.packages'),
        key: 'packages',
        render: (_, row) => {
          const ids = resolveInventoryPackages(row.rowId, common, overrides);
          return (
            <div className="space-y-2">
              {mode === 'edit' ? (
                <Select
                  mode="multiple"
                  className="w-full"
                  aria-label={t('inventory.import.packagesFor', {
                    serial: row.serial,
                  })}
                  placeholder={t('inventory.import.noPackages')}
                  showSearch
                  optionFilterProp="label"
                  disabled={disabled}
                  value={ids}
                  onChange={(value) => onChange(row.rowId, value)}
                  options={options.map((option) => ({
                    value: option.id,
                    label: `${option.code} — ${option.name}`,
                  }))}
                />
              ) : (
                <div>
                  {ids.length
                    ? ids
                        .map(
                          (id) =>
                            options.find((option) => option.id === id)?.name ??
                            id
                        )
                        .join(' · ')
                    : t('inventory.import.noPackages')}
                </div>
              )}
              {mode === 'review' ? (
                <ul className="m-0 space-y-1 pl-4 text-xs text-[#636466]">
                  {inventoryImportBenefits(ids, options).map((benefit) => (
                    <li key={benefit.id}>
                      {benefit.name} ·{' '}
                      {benefit.quota === null
                        ? t('inventory.import.timeOnly')
                        : t('inventory.import.quota', {
                            count: benefit.quota,
                          })}{' '}
                      ·{' '}
                      {benefit.termMonths === null
                        ? t('inventory.import.noTerm')
                        : t('inventory.import.term', {
                            count: benefit.termMonths,
                          })}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        },
      },
      {
        title: t('inventory.import.selection'),
        key: 'selection',
        width: 170,
        render: (_, row) =>
          overrides[row.rowId] !== undefined ? (
            <div className="space-y-2">
              <Tag>{t('inventory.import.customized')}</Tag>
              {mode === 'edit' ? (
                <Button
                  size="small"
                  disabled={disabled}
                  onClick={() => onReset(row.rowId)}
                >
                  {t('inventory.import.resetRow')}
                </Button>
              ) : null}
            </div>
          ) : (
            <span className="text-xs text-[#636466]">
              {t('inventory.import.fromBatch')}
            </span>
          ),
      }
    );
  return (
    <div className="space-y-3">
      <Input.Search
        aria-label={t('inventory.import.search')}
        placeholder={t('inventory.import.search')}
        value={search}
        allowClear
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <Table
        rowKey="rowId"
        size="small"
        columns={columns}
        dataSource={filtered}
        scroll={{ x: mode === 'serials' ? 400 : 760 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: filtered.length,
          showSizeChanger: false,
          onChange: setPage,
          showTotal: (total) =>
            t('inventory.import.deviceCount', { count: total }),
        }}
      />
    </div>
  );
}
