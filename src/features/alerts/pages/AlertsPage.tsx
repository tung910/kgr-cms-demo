import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';

import {
  AlertFilters,
  type AlertFiltersValue,
} from '../components/AlertFilters';
import { AlertList } from '../components/AlertList';
import { alertMockData } from '../mocks/alertMockData';

export function AlertsPage() {
  const { t } = useTranslation('alerts');
  const [alerts, setAlerts] = useState(alertMockData);
  const [filters, setFilters] = useState<AlertFiltersValue>({
    showResolved: false,
  });

  const updateFilters = (changes: Partial<AlertFiltersValue>) => {
    setFilters((previous) => ({ ...previous, ...changes }));
  };

  const assignAlert = (id: string) =>
    setAlerts((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, status: 'assigned', assignee: t('list.currentUser') }
          : item
      )
    );

  const resolveAlert = (id: string) =>
    setAlerts((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: 'resolved' } : item
      )
    );

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (filters.severity && alert.severity !== filters.severity) {
          return false;
        }
        if (!filters.showResolved && alert.status === 'resolved') {
          return false;
        }
        return true;
      }),
    [alerts, filters]
  );

  const openCount = alerts.filter(
    (alert) => alert.status !== 'resolved'
  ).length;
  const highCount = alerts.filter(
    (alert) => alert.severity === 'high' && alert.status !== 'resolved'
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PortalStatCard label={t('stats.open')} value={openCount} />
        <PortalStatCard label={t('stats.highUnresolved')} value={highCount} />
        <PortalStatCard label={t('stats.total')} value={alerts.length} />
      </div>
      <PortalCard padded={false}>
        <AlertFilters value={filters} onChange={updateFilters} />
        <AlertList
          alerts={filteredAlerts}
          onAssign={assignAlert}
          onResolve={resolveAlert}
        />
      </PortalCard>
    </div>
  );
}
