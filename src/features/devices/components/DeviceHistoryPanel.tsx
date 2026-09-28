import { useState } from 'react';
import type { ReactNode } from 'react';
import { DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Button, Tabs, Tag, Timeline } from 'antd';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalCard } from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';
import { downloadCsv, type CsvColumn } from '@/shared/lib/csv';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';
import { referenceColors, softTones } from '@/theme/tokens';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type {
  AlertHistoryEntry,
  ConnectivityEvent,
  FilterChangeEntry,
  OtaHistoryEntry,
  ServiceHistoryEntry,
} from '../schemas/deviceDetailSchemas';

type HistoryTab =
  'connectivity' | 'ota' | 'service' | 'alerts' | 'filterChanges';

const severityTone: Record<AlertHistoryEntry['severity'], PortalTone> = {
  P1: 'danger',
  P2: 'warning',
  P3: 'info',
  P4: 'warning',
};

function Empty({ text }: { text: string }) {
  return <p className="m-0 py-6 text-center text-sm text-[#636466]">{text}</p>;
}

// Each tab owns its request, so one slow or failing history never blocks
// the others.
function TabBody<T>({
  query,
  empty,
  error,
  loading,
  children,
}: {
  query: UseQueryResult<T[]>;
  empty: string;
  error: string;
  loading: string;
  children: (rows: T[]) => ReactNode;
}) {
  if (query.isError) return <Empty text={error} />;
  if (!query.data?.length)
    return query.isPending ? <Empty text={loading} /> : <Empty text={empty} />;
  return <>{children(query.data)}</>;
}

// §3.4d — online/offline, OTA, warranty/maintenance, alerts and filter
// changes. Gated by device.history.read in DeviceDetailPage; export needs
// device.history.export and never includes technician or owner names.
export function DeviceHistoryPanel({ device }: { device: Device }) {
  const { t, i18n } = useTranslation('devices');
  const locale = i18n.resolvedLanguage;
  const [activeTab, setActiveTab] = useState<HistoryTab>('connectivity');

  const connectivity = useQuery(deviceQueries.connectivityHistory(device.id));
  const ota = useQuery(deviceQueries.otaHistory(device.id));
  const service = useQuery(deviceQueries.serviceHistory(device.id));
  const alerts = useQuery(deviceQueries.alertHistory(device.id));
  const filterChanges = useQuery(deviceQueries.filterChangeHistory(device.id));

  const time = (value?: string) => (value ? formatDateTime(value, locale) : '');
  const duration = (seconds?: number) =>
    seconds === undefined
      ? ''
      : t('history.duration', {
          hours: Math.floor(seconds / 3600),
          minutes: Math.floor((seconds % 3600) / 60),
        });

  const exportTab = () => {
    const prefix = `device-${device.id}-${activeTab}`;
    const header = (key: string) => t('history.csv.' + key);
    if (activeTab === 'connectivity') {
      const columns: CsvColumn<ConnectivityEvent>[] = [
        { header: header('time'), value: (row) => time(row.occurredAt) },
        {
          header: header('event'),
          value: (row) => t('history.connectivity.' + row.event),
        },
        {
          header: header('durationMinutes'),
          value: (row) =>
            row.durationSeconds === undefined
              ? ''
              : String(Math.round(row.durationSeconds / 60)),
        },
      ];
      downloadCsv(connectivity.data ?? [], columns, prefix);
    } else if (activeTab === 'ota') {
      const columns: CsvColumn<OtaHistoryEntry>[] = [
        { header: header('time'), value: (row) => time(row.startedAt) },
        { header: header('track'), value: (row) => t('history.' + row.track) },
        { header: header('fromVersion'), value: (row) => row.fromVersion },
        { header: header('toVersion'), value: (row) => row.toVersion },
        {
          header: header('result'),
          value: (row) => t('history.otaResult.' + row.result),
        },
        {
          header: header('completedAt'),
          value: (row) => time(row.completedAt),
        },
      ];
      downloadCsv(ota.data ?? [], columns, prefix);
    } else if (activeTab === 'service') {
      const columns: CsvColumn<ServiceHistoryEntry>[] = [
        { header: header('time'), value: (row) => time(row.scheduledAt) },
        { header: header('ticket'), value: (row) => row.ticketId },
        {
          header: header('type'),
          value: (row) => t('history.serviceType.' + row.type),
        },
        { header: header('summary'), value: (row) => row.summary },
        {
          header: header('status'),
          value: (row) => t('history.serviceStatus.' + row.status),
        },
        {
          header: header('completedAt'),
          value: (row) => time(row.completedAt),
        },
      ];
      downloadCsv(service.data ?? [], columns, prefix);
    } else if (activeTab === 'alerts') {
      const columns: CsvColumn<AlertHistoryEntry>[] = [
        { header: header('time'), value: (row) => time(row.occurredAt) },
        { header: header('code'), value: (row) => row.code },
        { header: header('title'), value: (row) => row.title },
        { header: header('severity'), value: (row) => row.severity },
        {
          header: header('status'),
          value: (row) => t('history.alertStatus.' + row.status),
        },
        { header: header('closedAt'), value: (row) => time(row.closedAt) },
      ];
      downloadCsv(alerts.data ?? [], columns, prefix);
    } else {
      const columns: CsvColumn<FilterChangeEntry>[] = [
        { header: header('time'), value: (row) => time(row.changedAt) },
        { header: header('position'), value: (row) => row.position },
        { header: header('core'), value: (row) => row.coreName },
        { header: header('oldSerial'), value: (row) => row.oldSerial ?? '' },
        { header: header('newSerial'), value: (row) => row.newSerial },
        {
          header: header('channel'),
          value: (row) => t('history.channel.' + row.channel),
        },
      ];
      downloadCsv(filterChanges.data ?? [], columns, prefix);
    }
  };

  const activeRows = {
    connectivity: connectivity.data,
    ota: ota.data,
    service: service.data,
    alerts: alerts.data,
    filterChanges: filterChanges.data,
  }[activeTab];

  const loadError = t('history.loadError');
  const loading = t('history.loading');

  return (
    <PortalCard title={t('history.title')}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as HistoryTab)}
        tabBarExtraContent={
          <PermissionGuard capability="device.history.export">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              disabled={!activeRows?.length}
              onClick={exportTab}
            >
              {t('history.export')}
            </Button>
          </PermissionGuard>
        }
        items={[
          {
            key: 'connectivity',
            label: t('history.tabs.connectivity'),
            children: (
              <TabBody
                query={connectivity}
                empty={t('history.connectivityEmpty')}
                error={loadError}
                loading={loading}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color: entry.event === 'online' ? '#16A34A' : '#B42318',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {t('history.connectivity.' + entry.event)}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {time(entry.occurredAt)}
                            {entry.durationSeconds !== undefined
                              ? ` · ${duration(entry.durationSeconds)}`
                              : ''}
                          </p>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
          {
            key: 'ota',
            label: t('history.tabs.ota'),
            children: (
              <TabBody
                query={ota}
                empty={t('history.otaEmpty')}
                error={loadError}
                loading={loading}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color:
                        entry.result === 'success'
                          ? '#16A34A'
                          : entry.result === 'rolled_back'
                            ? '#F16522'
                            : '#B42318',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {t('history.' + entry.track)} · {entry.fromVersion}{' '}
                            → {entry.toVersion}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {time(entry.startedAt)}
                          </p>
                          <Tag className="mt-1">
                            {t('history.otaResult.' + entry.result)}
                          </Tag>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
          {
            key: 'service',
            label: t('history.tabs.service'),
            children: (
              <TabBody
                query={service}
                empty={t('history.serviceEmpty')}
                error={loadError}
                loading={loading}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color: '#087344',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {entry.ticketId} · {entry.summary}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {t('history.serviceType.' + entry.type)} ·{' '}
                            {time(entry.scheduledAt)}
                            {entry.technician ? ` · ${entry.technician}` : ''}
                          </p>
                          <Tag className="mt-1">
                            {t('history.serviceStatus.' + entry.status)}
                          </Tag>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
          {
            key: 'alerts',
            label: t('history.tabs.alerts'),
            children: (
              <TabBody
                query={alerts}
                empty={t('history.alertsEmpty')}
                error={loadError}
                loading={loading}
              >
                {(rows) => (
                  <ul className="m-0 list-none space-y-3 p-0">
                    {rows.map((entry) => {
                      const tone = severityTone[entry.severity];
                      return (
                        <li
                          key={entry.id}
                          className="flex items-center gap-3 rounded-xl border border-[#E7E8E9] p-3"
                        >
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: softTones[tone],
                              color: referenceColors[tone],
                            }}
                          >
                            <WarningOutlined />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-semibold text-[#020204]">
                              {entry.title}
                            </p>
                            <p className="m-0 mt-0.5 font-mono text-xs text-[#636466]">
                              {entry.severity}-{entry.code} ·{' '}
                              {time(entry.occurredAt)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#636466]">
                            {t('history.alertStatus.' + entry.status)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabBody>
            ),
          },
          {
            key: 'filterChanges',
            label: t('history.tabs.filterChanges'),
            children: (
              <TabBody
                query={filterChanges}
                empty={t('history.filterChangesEmpty')}
                error={loadError}
                loading={loading}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color: '#F16522',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {t('history.filterPosition', {
                              position: entry.position,
                              name: entry.coreName,
                            })}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {time(entry.changedAt)} ·{' '}
                            {t('history.channel.' + entry.channel)}
                          </p>
                          <p className="mb-0 mt-1 font-mono text-xs text-[#636466]">
                            {entry.oldSerial ? `${entry.oldSerial} → ` : ''}
                            {entry.newSerial}
                          </p>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
        ]}
      />
    </PortalCard>
  );
}
