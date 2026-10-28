import type { PortalTone } from '@/shared/components/portal';

import type {
  EntitlementEventType,
  EntitlementStatus,
} from '../schemas/entitlementSchemas';

// §5.3 status set, display order, and the shared tone convention (portal
// active/warning/neutral tones). `labelKey` lives in the `devices` i18n
// namespace under `entitlements.*`.
export const ENTITLEMENT_STATUSES = [
  { value: 'pending', labelKey: 'entitlements.statuses.pending', tone: 'info' },
  {
    value: 'active',
    labelKey: 'entitlements.statuses.active',
    tone: 'primary',
  },
  {
    value: 'expiring',
    labelKey: 'entitlements.statuses.expiring',
    tone: 'warning',
  },
  {
    value: 'exhausted',
    labelKey: 'entitlements.statuses.exhausted',
    tone: 'warning',
  },
  {
    value: 'expired',
    labelKey: 'entitlements.statuses.expired',
    tone: 'danger',
  },
  {
    value: 'revoked',
    labelKey: 'entitlements.statuses.revoked',
    tone: 'danger',
  },
] as const satisfies ReadonlyArray<{
  value: EntitlementStatus;
  labelKey: string;
  tone: PortalTone;
}>;

// §6.1/§10 usage-event history types shown in the entitlement detail block.
export const ENTITLEMENT_EVENT_TYPES = [
  { value: 'reserved', labelKey: 'entitlements.eventTypes.reserved' },
  { value: 'released', labelKey: 'entitlements.eventTypes.released' },
  { value: 'consumed', labelKey: 'entitlements.eventTypes.consumed' },
  { value: 'shipment', labelKey: 'entitlements.eventTypes.shipment' },
  { value: 'manual', labelKey: 'entitlements.eventTypes.manual' },
  { value: 'reversal', labelKey: 'entitlements.eventTypes.reversal' },
  {
    value: 'customer_qr_scan',
    labelKey: 'entitlements.eventTypes.customerQrScan',
  },
  { value: 'attached', labelKey: 'entitlements.eventTypes.attached' },
  { value: 'revoked', labelKey: 'entitlements.eventTypes.revoked' },
] as const satisfies ReadonlyArray<{
  value: EntitlementEventType;
  labelKey: string;
}>;
