import dayjs from 'dayjs';

import type { PortalTone } from '@/shared/components/portal';

import { ENTITLEMENT_STATUSES } from '../constants/entitlement';
import type {
  EntitlementStatus,
  EntitlementSummary,
} from '../schemas/entitlementSchemas';

// §5.3: the status tone convention is shared between the list column
// (EntitlementTags) and the detail block (DeviceEntitlementsPanel) — derived
// once here instead of hand-written in each component.
export const ENTITLEMENT_STATUS_TONE: Record<EntitlementStatus, PortalTone> =
  Object.fromEntries(
    ENTITLEMENT_STATUSES.map((status) => [status.value, status.tone])
  ) as Record<EntitlementStatus, PortalTone>;

// Presentational "days left" for an active/expiring entitlement. The server
// still owns `status` itself (§5.3 — the client never re-derives it from
// dates); this is display-only arithmetic for the "còn N ngày" copy.
export function daysRemaining(
  endsAt: string | null,
  now: dayjs.Dayjs = dayjs()
): number {
  if (!endsAt) return 0;
  return Math.max(0, dayjs(endsAt).diff(now, 'day'));
}

// §5.4 — entitlements that still carry value move with the device on an
// ownership change; `pending` (not started), `expired` and `revoked` don't.
const TRANSFERRING_STATUSES: ReadonlySet<EntitlementStatus> = new Set([
  'active',
  'expiring',
  'exhausted',
]);

export function activeEntitlementsCount(items: EntitlementSummary[]): number {
  return items.filter((item) => TRANSFERRING_STATUSES.has(item.status)).length;
}
