import type { CoreType } from '../schemas/coreLifecycleSchemas';
import type {
  BatchLifespanStatus,
  LockedLifespan,
} from '../schemas/serialSchemas';

export const MIN_REASON_LENGTH = 5;

// System defaults, not configurable: the app countdown turns yellow when a
// core has 30% of its locked lifespan left and red at 10%, for every type.
export const CORE_WARNING_PERCENT = 30;
export const CORE_CRITICAL_PERCENT = 10;

// A core expires on whichever limit runs out first: filter hours or months
// of device operation. Shared by the portal form and the mock backend so both
// enforce the same 9.3 bounds: floor% of the standard ≤ batch ≤ standard.
export function lifespanFloor(value: number, floorPercent: number): number {
  return Math.ceil((value * floorPercent) / 100);
}

export function batchLifespanBounds(
  core: Pick<CoreType, 'standardMonths' | 'standardHours' | 'floorPercent'>
) {
  return {
    minMonths: lifespanFloor(core.standardMonths, core.floorPercent),
    maxMonths: core.standardMonths,
    minHours: lifespanFloor(core.standardHours, core.floorPercent),
    maxHours: core.standardHours,
  };
}

// A pending batch has no lifespan of its own yet: it follows the core type's
// current standard until it is confirmed.
export function effectiveBatchLifespan(
  batch: {
    lifespanStatus: BatchLifespanStatus;
    lifespanMonths: number | null;
    lifespanHours: number | null;
  },
  core: Pick<CoreType, 'standardMonths' | 'standardHours'>
): LockedLifespan {
  return batch.lifespanStatus === 'confirmed' &&
    batch.lifespanMonths !== null &&
    batch.lifespanHours !== null
    ? {
        months: batch.lifespanMonths,
        hours: batch.lifespanHours,
        source: 'batch',
      }
    : {
        months: core.standardMonths,
        hours: core.standardHours,
        source: 'standard',
      };
}

// A reason is optional only when a pending batch keeps the standard.
export function batchLifespanNeedsReason(
  core: Pick<CoreType, 'standardMonths' | 'standardHours'>,
  status: BatchLifespanStatus,
  months: number,
  hours: number
): boolean {
  return (
    status === 'confirmed' ||
    months !== core.standardMonths ||
    hours !== core.standardHours
  );
}

// Hours are the primary limit, so "vs. standard" compares hours.
export function lifespanPercent(hours: number, standardHours: number) {
  return Math.round((hours / standardHours) * 100);
}

// Remaining life at which the app countdown turns yellow / red, e.g.
// 250 h · 12 months at 30% / 10% → ≤ 75 h · 3.6 months / ≤ 25 h · 1.2 months.
export function warningThresholds(lifespan: { months: number; hours: number }) {
  const share = (value: number, percent: number, digits: number) =>
    Math.round(((value * percent) / 100) * 10 ** digits) / 10 ** digits;
  return {
    warningHours: share(lifespan.hours, CORE_WARNING_PERCENT, 0),
    warningMonths: share(lifespan.months, CORE_WARNING_PERCENT, 1),
    criticalHours: share(lifespan.hours, CORE_CRITICAL_PERCENT, 0),
    criticalMonths: share(lifespan.months, CORE_CRITICAL_PERCENT, 1),
  };
}
