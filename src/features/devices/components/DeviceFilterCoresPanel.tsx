import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  PortalBadge,
  PortalCard,
  PortalProgress,
} from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import {
  coreHealth,
  remainingPercent,
  type CoreHealth,
} from '../utils/coreHealth';

const healthTone: Record<CoreHealth, PortalTone> = {
  good: 'primary',
  poor: 'warning',
  critical: 'danger',
};

const healthRowClass: Record<CoreHealth, string> = {
  good: '',
  poor: 'bg-[#FFFBEB]',
  critical: 'bg-[#FEF3F2]',
};

// §3.4 — remaining life per core; thresholds come from the M04.1 config,
// the same source that drives the core-alert block.
export function DeviceFilterCoresPanel({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const cores = useQuery(deviceQueries.filterCores(device.id));

  return (
    <PortalCard
      title={
        <div>
          <div className="flex items-center gap-2">
            {t('filterCores.title')}
            {cores.data?.length ? (
              <PortalBadge tone="info">
                {t('filterCores.levels', { count: cores.data.length })}
              </PortalBadge>
            ) : null}
          </div>
          <p className="m-0 text-xs font-normal text-[#636466]">
            {t('filterCores.description')}
          </p>
        </div>
      }
    >
      {!cores.data?.length ? (
        <p className="m-0 text-sm text-[#636466]">
          {cores.isPending
            ? t('filterCores.loading')
            : cores.isError
              ? t('filterCores.error')
              : t('filterCores.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-solid border-[#EEEFEF]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#F7F8FA] text-left text-xs uppercase text-[#636466]">
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.level')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.type')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.core')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.time')}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t('filterCores.columns.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {cores.data.map((core, index) => {
                const percent = remainingPercent(
                  core.remainingDays,
                  core.totalDays
                );
                const health = coreHealth(
                  percent,
                  core.poorPercent,
                  core.criticalPercent
                );
                return (
                  <tr
                    key={core.position}
                    className={`border-0 border-t border-solid border-[#EEEFEF] ${healthRowClass[health]}`}
                  >
                    <td className="px-4 py-3">
                      <PortalBadge tone="info">
                        {t('filterCores.level', {
                          index: String(index + 1).padStart(2, '0'),
                        })}
                      </PortalBadge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#020204]">
                      {core.coreType}
                    </td>
                    <td className="px-4 py-3">
                      <p className="m-0 font-semibold text-[#020204]">
                        {core.coreName}
                      </p>
                      {core.purpose || core.skuName ? (
                        <p className="m-0 text-xs text-[#636466]">
                          {[core.purpose, core.skuName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="w-[32%] px-4 py-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[#636466]">
                          {t('filterCores.remainingOfTotal', {
                            remaining: Math.max(0, core.remainingDays),
                            total: core.totalDays,
                          })}
                        </span>
                        <span className="font-semibold text-[#020204]">
                          {t('filterCores.remainingPercent', { percent })}
                        </span>
                      </div>
                      <PortalProgress
                        value={percent}
                        max={100}
                        tone={healthTone[health]}
                        className="h-1.5"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PortalBadge tone={healthTone[health]} dot>
                        {t('filterCores.health.' + health)}
                      </PortalBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PortalCard>
  );
}
