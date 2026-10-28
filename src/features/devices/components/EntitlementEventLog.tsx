import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Collapse, Pagination, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';

import { deviceQueries } from '../queries/deviceQueries';
import type { EntitlementEvent } from '../schemas/entitlementSchemas';

const PAGE_SIZE = 10;

function eventTypeKey(type: EntitlementEvent['type']): string {
  return type === 'customer_qr_scan' ? 'customerQrScan' : type;
}

function referenceText(event: EntitlementEvent): string {
  return (
    event.reference.ticketCode ??
    event.reference.trackingCode ??
    event.reference.coreQrCode ??
    '—'
  );
}

export interface EntitlementEventLogProps {
  entitlementId: string;
}

// §8.2/§10 — collapsible, paginated (10/page) usage-event history for one
// entitlement. Read-only: no edit/delete affordance, matching §6.2 "Lịch sử
// sử dụng không sửa/xoá được từ UI". Only fetches once expanded.
export function EntitlementEventLog({
  entitlementId,
}: EntitlementEventLogProps) {
  const { t, i18n } = useTranslation('devices');
  const locale = i18n.resolvedLanguage;
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const events = useQuery({
    ...deviceQueries.entitlementEvents(entitlementId, page),
    enabled: expanded,
  });

  const columns: ColumnsType<EntitlementEvent> = [
    {
      title: t('entitlements.eventLog.columns.time'),
      key: 'time',
      render: (_: unknown, event: EntitlementEvent) => (
        <span className="whitespace-nowrap text-xs">
          {formatDateTime(event.occurredAt, locale)}
        </span>
      ),
    },
    {
      title: t('entitlements.eventLog.columns.type'),
      key: 'type',
      render: (_: unknown, event: EntitlementEvent) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <Tag className="m-0">
            {t('entitlements.eventTypes.' + eventTypeKey(event.type))}
          </Tag>
          {!event.countsAgainstQuota ? (
            <Tag className="m-0">{t('entitlements.eventLog.notCounted')}</Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: t('entitlements.eventLog.columns.reference'),
      key: 'reference',
      render: (_: unknown, event: EntitlementEvent) => (
        <span className="font-mono text-xs">{referenceText(event)}</span>
      ),
    },
    {
      title: t('entitlements.eventLog.columns.actor'),
      key: 'actor',
      render: (_: unknown, event: EntitlementEvent) => event.actor.name,
    },
  ];

  return (
    <Collapse
      size="small"
      onChange={(keys) =>
        setExpanded(Array.isArray(keys) ? keys.length > 0 : Boolean(keys))
      }
      items={[
        {
          key: 'history',
          label: t('entitlements.eventLog.title'),
          children: (
            <div className="space-y-2">
              {events.isError ? (
                <p className="m-0 text-sm text-[#636466]">
                  {t('entitlements.eventLog.error')}
                </p>
              ) : (
                <Table<EntitlementEvent>
                  rowKey="id"
                  size="small"
                  pagination={false}
                  loading={expanded && events.isPending}
                  columns={columns}
                  dataSource={events.data?.items ?? []}
                  locale={{ emptyText: t('entitlements.eventLog.empty') }}
                />
              )}
              {events.data && events.data.total > PAGE_SIZE ? (
                <div className="flex justify-end">
                  <Pagination
                    size="small"
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={events.data.total}
                    showSizeChanger={false}
                    onChange={(nextPage) => setPage(nextPage)}
                  />
                </div>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
