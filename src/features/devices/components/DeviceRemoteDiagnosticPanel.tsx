import type { ReactNode } from 'react';
import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Collapse } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PortalBadge, PortalCard } from '@/shared/components/portal';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import { DeviceRemoteActions } from './DeviceRemoteActions';

type AuditStatus = 'pending' | 'ack' | 'timeout' | 'rejected';

interface AuditRow {
  id: string;
  code: string;
  label: string;
  at: string;
  status: AuditStatus;
}

const AUDIT_ROWS = 5;

const statusIcon: Record<AuditStatus, ReactNode> = {
  pending: <ClockCircleOutlined />,
  ack: <CheckOutlined />,
  timeout: <ClockCircleOutlined />,
  rejected: <CloseOutlined />,
};

const statusClass: Record<AuditStatus, string> = {
  pending: 'bg-[#E9F1FC] text-[#2F7EDE]',
  ack: 'bg-[#E7F4EC] text-[#058642]',
  timeout: 'bg-[#FEF0E9] text-[#F26522]',
  rejected: 'bg-[#FBE3E4] text-[#D9131F]',
};

const statusText: Record<AuditStatus, string> = {
  pending: 'text-[#2F7EDE]',
  ack: 'text-[#058642]',
  timeout: 'text-[#F26522]',
  rejected: 'text-[#D9131F]',
};

// M03 remote diagnostic — support commands plus their audit trail; every
// send lands here immutably. The power toggle stays in the header menu.
export function DeviceRemoteDiagnosticPanel({ device }: { device: Device }) {
  const { t, i18n } = useTranslation('devices');
  const { session } = useAuth();
  const canDiagnose = Boolean(
    session && hasCapability(session.role, 'device.diagnose')
  );
  const canControl = Boolean(
    session && hasCapability(session.role, 'device.control')
  );
  const jobs = useQuery({
    ...deviceQueries.diagnosticsJobs(device.id),
    enabled: canDiagnose,
    // Poll only while a job is still resolving.
    refetchInterval: (query) =>
      query.state.data?.some((job) => job.status === 'pending') ? 1500 : false,
  });
  const commandLog = useQuery({
    ...deviceQueries.commandLog(device.id),
    enabled: canControl || canDiagnose,
  });

  if (!canDiagnose && !canControl) return null;

  const auditRows: AuditRow[] = [
    ...(jobs.data ?? []).map((job): AuditRow => ({
      id: job.id,
      code: 'READ_STATUS',
      label: t('remoteDiagnostic.readStatus'),
      at: job.requestedAt,
      status:
        job.status === 'ready'
          ? 'ack'
          : job.status === 'failed'
            ? 'timeout'
            : 'pending',
    })),
    ...(commandLog.data ?? []).map((entry): AuditRow => ({
      id: entry.id,
      code: entry.command.toUpperCase(),
      label: t('controlPanel.commands.' + entry.command, {
        defaultValue: entry.command,
      }),
      at: entry.requestedAt,
      status: entry.status,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, AUDIT_ROWS);

  const timeFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const readiness: 'ready' | 'busy' | 'offline' =
    device.status === 'offline'
      ? 'offline'
      : auditRows.some((row) => row.status === 'pending')
        ? 'busy'
        : 'ready';
  const descriptionParts = (['send', 'timeout', 'audit'] as const).map((key) =>
    t('remoteDiagnostic.descriptionParts.' + key)
  );
  const readyJobs = (jobs.data ?? []).filter(
    (job) => job.status === 'ready' && job.metrics
  );

  return (
    <PortalCard
      className="h-full"
      title={
        <div>
          <div>{t('remoteDiagnostic.title')}</div>
          <p className="m-0 flex flex-wrap items-center gap-x-2 text-xs font-normal text-[#636466]">
            {descriptionParts.map((part, index) => (
              <span key={part} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden className="text-[#C4C6C8]">
                    •
                  </span>
                ) : null}
                {part}
              </span>
            ))}
          </p>
        </div>
      }
      actions={
        <PortalBadge
          tone={
            readiness === 'ready'
              ? 'primary'
              : readiness === 'busy'
                ? 'info'
                : 'danger'
          }
          dot
        >
          {t('remoteDiagnostic.readiness.' + readiness)}
        </PortalBadge>
      }
    >
      <div className="mb-6 empty:hidden">
        <DeviceRemoteActions device={device} placement="panel" />
      </div>
      <p className="mb-3 mt-0 text-xs font-semibold uppercase tracking-wide text-[#636466]">
        {t('remoteDiagnostic.auditTitle')}
      </p>
      {auditRows.length === 0 ? (
        <p className="m-0 text-sm text-[#636466]">
          {t('remoteDiagnostic.auditEmpty')}
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2.5 p-0">
          {auditRows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-2xl border border-solid border-[#EEEFEF] bg-[#F9FAFB] px-5 py-3 text-sm"
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${statusClass[row.status]}`}
              >
                {statusIcon[row.status]}
              </span>
              <span className="font-mono text-xs font-semibold text-[#020204]">
                {row.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#636466]">
                {row.label}
              </span>
              <span
                className="font-mono text-xs text-[#020204]"
                title={formatDateTime(row.at, i18n.resolvedLanguage)}
              >
                {timeFormat.format(new Date(row.at))}
              </span>
              <span
                className={`w-16 text-right font-mono text-xs font-semibold ${statusText[row.status]}`}
              >
                {t('remoteDiagnostic.auditStatus.' + row.status)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {readyJobs.length > 0 ? (
        <Collapse
          className="mt-4"
          size="small"
          items={[
            {
              key: 'packages',
              label: t('remoteDiagnostic.packages', {
                count: readyJobs.length,
              }),
              children: (
                <div className="space-y-3">
                  {readyJobs.map((job) => (
                    <div key={job.id}>
                      <p className="m-0 text-xs text-[#636466]">
                        {formatDateTime(job.requestedAt, i18n.resolvedLanguage)}
                      </p>
                      <ul className="m-0 list-disc pl-4 text-sm">
                        {job.metrics?.map((metric) => (
                          <li key={metric.label}>
                            {metric.label}: <b>{metric.value}</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </PortalCard>
  );
}
