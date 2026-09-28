import { type CsvColumn, downloadCsv } from '@/shared/lib/csv';

import type { AuditEntry } from '../schemas/systemSchemas';

const columns: CsvColumn<AuditEntry>[] = [
  { header: 'Time', value: (e) => e.occurredAt },
  { header: 'Actor', value: (e) => e.actorName },
  { header: 'IP', value: (e) => e.ip },
  { header: 'Module', value: (e) => e.module },
  { header: 'Action', value: (e) => e.action },
  { header: 'Target', value: (e) => e.target },
  { header: 'Reason', value: (e) => e.reason ?? '' },
  {
    header: 'Before',
    value: (e) => (e.before ? JSON.stringify(e.before) : ''),
  },
  { header: 'After', value: (e) => (e.after ? JSON.stringify(e.after) : '') },
];

export function downloadAuditCsv(entries: readonly AuditEntry[]): void {
  downloadCsv(entries, columns, 'audit-log');
}
