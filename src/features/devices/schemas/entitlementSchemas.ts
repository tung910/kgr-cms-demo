import { z } from 'zod';

import {
  servicePackageConfigurationSchema,
  serviceTypeCodeSchema,
  type ServicePackageConfiguration,
} from '@/features/service-packages/schemas/servicePackageConfiguration';
import {
  quotaModeSchema,
  servicePackageGroupSchema,
  type QuotaMode,
  type ServicePackageGroup,
} from '@/features/service-packages/schemas/servicePackageSchemas';
import type { ServiceTypeCode } from '@/features/service-packages/constants/servicePackageTypes';
import type { EntitlementKind } from '@/features/service-packages/utils/entitlementRules';

// Device service entitlements (spec §3, §5, §6, §11): a package snapshot
// attached to a device, its usage, and its immutable usage-event history.
// DTO snake_case, parsed with Zod at the API boundary; domain camelCase.

// §5.3 status priority order: revoked > expired > exhausted > expiring >
// active > pending. Computed server-side (mock store) at read time — the
// client never re-derives it from dates.
export const entitlementStatusSchema = z.enum([
  'pending',
  'active',
  'expiring',
  'exhausted',
  'expired',
  'revoked',
]);
export type EntitlementStatus = z.infer<typeof entitlementStatusSchema>;

export const entitlementKindSchema = z.enum([
  'one_time',
  'counted',
  'time_only',
]);

export const entitlementEventTypeSchema = z.enum([
  'reserved',
  'released',
  'consumed',
  'shipment',
  'manual',
  'reversal',
  'customer_qr_scan',
  'attached',
  'revoked',
]);
export type EntitlementEventType = z.infer<typeof entitlementEventTypeSchema>;

// §3: a deep copy of the package at attach time — no live reference back to
// `packageStore`. Changing the catalogue later never affects an already
// attached entitlement (§4.3 "Đổi nội dung gói").
export const entitlementPackageSnapshotDtoSchema = z.object({
  package_id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  group: servicePackageGroupSchema,
  service_type_code: serviceTypeCodeSchema,
  delivery: z.enum(['self', 'technician', 'shipment']).nullable(),
  term_months: z.number().int().positive().nullable(),
  interval_months: z.number().int().positive().nullable(),
  purpose: z.string().min(1),
  included_items: z.array(z.string()),
  excluded_items: z.array(z.string()),
  eligibility_description: z.string().min(1),
  model_scope: z.enum(['all', 'selected']),
  eligible_model_ids: z.array(z.string()),
  pricing_mode: z.enum(['fixed', 'free_or_included', 'quotation']),
  pricing_description: z.string().nullable(),
  additional_cost_description: z.string().nullable(),
  configuration: servicePackageConfigurationSchema,
  quota_mode: quotaModeSchema,
  custom_quota: z.number().int().positive().nullable(),
  // Final computed quota (entitlementRules.computeEntitlementQuota), frozen
  // once at attach time alongside the rest of the snapshot (spec §5.1).
  quota: z.number().int().nonnegative().nullable(),
});
export type EntitlementPackageSnapshotDto = z.infer<
  typeof entitlementPackageSnapshotDtoSchema
>;

export const entitlementSourceSchema = z.object({
  kind: z.enum([
    'auto_attach',
    'bulk_assign',
    'manual_add',
    'inventory_import',
  ]),
  reference: z.string().min(1),
  at: z.string().datetime({ offset: true }),
});
export type EntitlementSourceDto = z.infer<typeof entitlementSourceSchema>;

export const entitlementOpenReservationDtoSchema = z.object({
  ticket_id: z.string().min(1),
  ticket_code: z.string().min(1),
  ticket_status: z.enum(['pending', 'assigned', 'in_progress']),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
});
export type EntitlementOpenReservationDto = z.infer<
  typeof entitlementOpenReservationDtoSchema
>;

export const entitlementDtoSchema = z.object({
  id: z.string().min(1),
  device_id: z.string().min(1),
  package_snapshot: entitlementPackageSnapshotDtoSchema,
  kind: entitlementKindSchema,
  quota: z.number().int().nonnegative().nullable(),
  used: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  status: entitlementStatusSchema,
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  next_due_at: z.string().datetime({ offset: true }).nullable(),
  source: entitlementSourceSchema,
  open_reservations: z.array(entitlementOpenReservationDtoSchema),
});
export type EntitlementDto = z.infer<typeof entitlementDtoSchema>;

export const entitlementEventReferenceDtoSchema = z.object({
  ticket_code: z.string().optional(),
  tracking_code: z.string().optional(),
  core_qr_code: z.string().optional(),
  reversed_event_id: z.string().optional(),
});
export type EntitlementEventReferenceDto = z.infer<
  typeof entitlementEventReferenceDtoSchema
>;

export const entitlementEventDtoSchema = z.object({
  id: z.string().min(1),
  entitlement_id: z.string().min(1),
  type: entitlementEventTypeSchema,
  counts_against_quota: z.boolean(),
  reference: entitlementEventReferenceDtoSchema,
  reason: z.string().nullable(),
  note: z.string().nullable(),
  actor: z.object({
    kind: z.enum(['staff', 'system']),
    name: z.string().min(1),
  }),
  occurred_at: z.string().datetime({ offset: true }),
});
export type EntitlementEventDto = z.infer<typeof entitlementEventDtoSchema>;

export const entitlementEventPageDtoSchema = z.object({
  items: z.array(entitlementEventDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type EntitlementEventPageDto = z.infer<
  typeof entitlementEventPageDtoSchema
>;

// §11 device/inventory list row summary + `term_months`/`source_reference`
// (Task 4 brief) for the stock-tab tooltip (§8.2). Excludes revoked/expired.
export const entitlementSummaryDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: entitlementKindSchema,
  status: entitlementStatusSchema,
  used: z.number().int().nonnegative(),
  quota: z.number().int().nonnegative().nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  term_months: z.number().int().positive().nullable(),
  source_reference: z.string(),
});
export type EntitlementSummaryDto = z.infer<typeof entitlementSummaryDtoSchema>;

// ---- Domain (camelCase) ----------------------------------------------------

export interface EntitlementPackageSnapshot {
  packageId: string;
  code: string;
  name: string;
  group: ServicePackageGroup;
  serviceTypeCode: ServiceTypeCode;
  delivery: 'self' | 'technician' | 'shipment' | null;
  termMonths: number | null;
  intervalMonths: number | null;
  purpose: string;
  includedItems: string[];
  excludedItems: string[];
  eligibilityDescription: string;
  modelScope: 'all' | 'selected';
  eligibleModelIds: string[];
  pricingMode: 'fixed' | 'free_or_included' | 'quotation';
  pricingDescription: string | null;
  additionalCostDescription: string | null;
  configuration: ServicePackageConfiguration;
  quotaMode: QuotaMode;
  customQuota: number | null;
  quota: number | null;
}

export interface EntitlementSource {
  kind: 'auto_attach' | 'bulk_assign' | 'manual_add' | 'inventory_import';
  reference: string;
  at: string;
}

export interface EntitlementOpenReservation {
  ticketId: string;
  ticketCode: string;
  ticketStatus: 'pending' | 'assigned' | 'in_progress';
  scheduledAt: string | null;
}

export interface Entitlement {
  id: string;
  deviceId: string;
  packageSnapshot: EntitlementPackageSnapshot;
  kind: EntitlementKind;
  quota: number | null;
  used: number;
  reserved: number;
  status: EntitlementStatus;
  startsAt: string | null;
  endsAt: string | null;
  nextDueAt: string | null;
  source: EntitlementSource;
  openReservations: EntitlementOpenReservation[];
}

export interface EntitlementEventReference {
  ticketCode?: string;
  trackingCode?: string;
  coreQrCode?: string;
  reversedEventId?: string;
}

export interface EntitlementEvent {
  id: string;
  entitlementId: string;
  type: EntitlementEventType;
  countsAgainstQuota: boolean;
  reference: EntitlementEventReference;
  reason: string | null;
  note: string | null;
  actor: { kind: 'staff' | 'system'; name: string };
  occurredAt: string;
}

export interface EntitlementSummary {
  id: string;
  name: string;
  kind: EntitlementKind;
  status: EntitlementStatus;
  used: number;
  quota: number | null;
  endsAt: string | null;
  termMonths: number | null;
  sourceReference: string;
}
