import type { AlertSla } from '../schemas/alertSchemas';

export type SlaState =
  'none' | 'running' | 'warning' | 'overdue' | 'met' | 'late';

export function getSlaState(sla: AlertSla, now: number): SlaState {
  if (sla.dueAt === null) return 'none';
  const dueAt = Date.parse(sla.dueAt);
  if (sla.stoppedAt !== null)
    return Date.parse(sla.stoppedAt) <= dueAt ? 'met' : 'late';
  if (now >= dueAt) return 'overdue';
  if (sla.warningAt !== null && now >= Date.parse(sla.warningAt))
    return 'warning';
  return 'running';
}

export function getSlaDurationMs(
  sla: AlertSla,
  raisedAt: string,
  now: number
): number | null {
  if (sla.dueAt === null) return null;
  return sla.stoppedAt === null
    ? Date.parse(sla.dueAt) - now
    : Date.parse(sla.stoppedAt) - Date.parse(raisedAt);
}
