import type { PortalTone } from '@/shared/components/portal';

// ⚠️ Assumption: the spec sets no aging thresholds for unsold stock; 90/180
// days are placeholders until warehouse/sales confirm them.
export const AGING_WARNING_DAYS = 90;
export const AGED_STOCK_DAYS = 180;

export function stockAgeTone(days: number): PortalTone {
  if (days > AGED_STOCK_DAYS) return 'danger';
  if (days > AGING_WARNING_DAYS) return 'warning';
  return 'primary';
}
