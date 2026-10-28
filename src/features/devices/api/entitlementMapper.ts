import type { PageResponse } from '@/shared/types/pagination';

import type {
  Entitlement,
  EntitlementDto,
  EntitlementEvent,
  EntitlementEventDto,
  EntitlementEventPageDto,
  EntitlementPackageSnapshot,
  EntitlementPackageSnapshotDto,
  EntitlementSummary,
  EntitlementSummaryDto,
} from '../schemas/entitlementSchemas';

function mapPackageSnapshot(
  dto: EntitlementPackageSnapshotDto
): EntitlementPackageSnapshot {
  return {
    packageId: dto.package_id,
    code: dto.code,
    name: dto.name,
    group: dto.group,
    serviceTypeCode: dto.service_type_code,
    delivery: dto.delivery,
    termMonths: dto.term_months,
    intervalMonths: dto.interval_months,
    purpose: dto.purpose,
    includedItems: dto.included_items,
    excludedItems: dto.excluded_items,
    eligibilityDescription: dto.eligibility_description,
    modelScope: dto.model_scope,
    eligibleModelIds: dto.eligible_model_ids,
    pricingMode: dto.pricing_mode,
    pricingDescription: dto.pricing_description,
    additionalCostDescription: dto.additional_cost_description,
    configuration: dto.configuration,
    quotaMode: dto.quota_mode,
    customQuota: dto.custom_quota,
    quota: dto.quota,
  };
}

export function mapEntitlement(dto: EntitlementDto): Entitlement {
  return {
    id: dto.id,
    deviceId: dto.device_id,
    packageSnapshot: mapPackageSnapshot(dto.package_snapshot),
    kind: dto.kind,
    quota: dto.quota,
    used: dto.used,
    reserved: dto.reserved,
    status: dto.status,
    startsAt: dto.starts_at,
    endsAt: dto.ends_at,
    nextDueAt: dto.next_due_at,
    source: {
      kind: dto.source.kind,
      reference: dto.source.reference,
      at: dto.source.at,
    },
    openReservations: dto.open_reservations.map((reservation) => ({
      ticketId: reservation.ticket_id,
      ticketCode: reservation.ticket_code,
      ticketStatus: reservation.ticket_status,
      scheduledAt: reservation.scheduled_at,
    })),
  };
}

export function mapEntitlementEvent(
  dto: EntitlementEventDto
): EntitlementEvent {
  return {
    id: dto.id,
    entitlementId: dto.entitlement_id,
    type: dto.type,
    countsAgainstQuota: dto.counts_against_quota,
    reference: {
      ...(dto.reference.ticket_code && {
        ticketCode: dto.reference.ticket_code,
      }),
      ...(dto.reference.tracking_code && {
        trackingCode: dto.reference.tracking_code,
      }),
      ...(dto.reference.core_qr_code && {
        coreQrCode: dto.reference.core_qr_code,
      }),
      ...(dto.reference.reversed_event_id && {
        reversedEventId: dto.reference.reversed_event_id,
      }),
    },
    reason: dto.reason,
    note: dto.note,
    actor: { kind: dto.actor.kind, name: dto.actor.name },
    occurredAt: dto.occurred_at,
  };
}

export function mapEntitlementEventPage(
  dto: EntitlementEventPageDto
): PageResponse<EntitlementEvent> {
  return {
    items: dto.items.map(mapEntitlementEvent),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}

export function mapEntitlementSummary(
  dto: EntitlementSummaryDto
): EntitlementSummary {
  return {
    id: dto.id,
    name: dto.name,
    kind: dto.kind,
    status: dto.status,
    used: dto.used,
    quota: dto.quota,
    endsAt: dto.ends_at,
    termMonths: dto.term_months,
    sourceReference: dto.source_reference,
  };
}
