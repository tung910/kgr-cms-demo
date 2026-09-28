import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  PortalCard,
  PortalChart,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';

import { ErrorBreakdownTable } from '../components/ErrorBreakdownTable';
import {
  analyticsKpiMockData,
  errorBreakdownMockData,
  monthlyTicketTrendMockData,
} from '../mocks/analyticsMockData';

export function AnalyticsPage() {
  const { t } = useTranslation('analytics');
  const maxTickets = Math.max(
    ...monthlyTicketTrendMockData.map((item) => item.tickets)
  );

  const handleExport = () => {
    message.success(t('page.exportSuccess'));
  };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description')}
        actions={
          <Button onClick={handleExport}>{t('page.exportButton')}</Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard
          label={t('kpi.activeDevices')}
          value={analyticsKpiMockData.activeDevices.toLocaleString('vi-VN')}
        />
        <PortalStatCard
          label={t('kpi.openTickets')}
          value={analyticsKpiMockData.openTickets}
        />
        <PortalStatCard
          label={t('kpi.avgResolutionHours')}
          value={t('kpi.avgResolutionHoursValue', {
            hours: analyticsKpiMockData.avgResolutionHours,
          })}
        />
        <PortalStatCard
          label={t('kpi.filterRecallRate')}
          value={`${analyticsKpiMockData.filterRecallRate}%`}
        />
      </div>
      <PortalChart
        title={t('chart.title')}
        description={t('chart.description')}
      >
        <div className="space-y-4 py-3">
          {monthlyTicketTrendMockData.map((item) => (
            <div key={item.month}>
              <div className="mb-2 flex justify-between text-sm">
                <span>{item.month}</span>
                <span className="font-semibold tabular-nums">
                  {item.tickets}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#F3F4F4]">
                <div
                  className="h-full rounded-full bg-[#F16522]"
                  style={{
                    width: `${(item.tickets / maxTickets) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </PortalChart>
      <PortalCard padded={false} className="p-4">
        <ErrorBreakdownTable errors={errorBreakdownMockData} />
      </PortalCard>
    </div>
  );
}
