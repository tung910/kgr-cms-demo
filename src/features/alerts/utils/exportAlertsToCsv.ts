import { downloadCsv } from '@/shared/lib/csv';
import type { Alert } from '../schemas/alertSchemas';

export interface AlertCsvLabels {
  headers: {
    name: string;
    severity: string;
    errorCode: string;
    deviceId: string;
    model: string;
    region: string;
    raisedAt: string;
    status: string;
    handler: string;
    ticketCode: string;
    ticketStatus: string;
  };
  severity: (value: Alert['severity']) => string;
  status: (value: Alert['status']) => string;
  ticketStatus: (value: NonNullable<Alert['ticket']>['status']) => string;
  formatDateTime: (value: string) => string;
}
export function downloadAlertsCsv(
  alerts: Alert[],
  labels: AlertCsvLabels
): void {
  downloadCsv(
    alerts,
    [
      { header: labels.headers.name, value: (row) => row.name },
      {
        header: labels.headers.severity,
        value: (row) => labels.severity(row.severity),
      },
      { header: labels.headers.errorCode, value: (row) => row.errorCode },
      { header: labels.headers.deviceId, value: (row) => row.deviceId },
      { header: labels.headers.model, value: (row) => row.modelName },
      { header: labels.headers.region, value: (row) => row.region },
      {
        header: labels.headers.raisedAt,
        value: (row) => labels.formatDateTime(row.raisedAt),
      },
      {
        header: labels.headers.status,
        value: (row) => labels.status(row.status),
      },
      {
        header: labels.headers.handler,
        value: (row) => row.handler?.name ?? '',
      },
      {
        header: labels.headers.ticketCode,
        value: (row) => row.ticket?.code ?? '',
      },
      {
        header: labels.headers.ticketStatus,
        value: (row) =>
          row.ticket ? labels.ticketStatus(row.ticket.status) : '',
      },
    ],
    'alerts'
  );
}
