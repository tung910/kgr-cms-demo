export type CoreHealth = 'good' | 'poor' | 'critical';

export function remainingPercent(
  remainingDays: number,
  totalDays: number
): number {
  if (totalDays <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((remainingDays / totalDays) * 100))
  );
}

// Thresholds come per core from the M04.1 config — never hard-code them here.
export function coreHealth(
  remaining: number,
  poorPercent: number,
  criticalPercent: number
): CoreHealth {
  if (remaining <= criticalPercent) return 'critical';
  if (remaining <= poorPercent) return 'poor';
  return 'good';
}
