import type {
  Alert,
  AlertCounts,
  AlertDetail,
  AlertDetailDto,
  AlertDto,
  AlertFilterOptions,
  AlertPageDto,
  TechnicianSuggestions,
  TechnicianSuggestionsDto,
} from '../schemas/alertSchemas';
import type { PageResponse } from '@/shared/types/pagination';

export function mapAlert(dto: AlertDto): Alert {
  return {
    id: dto.id,
    name: dto.name,
    errorCode: dto.error_code,
    severity: dto.severity,
    handlerGroup: dto.handler_group,
    status: dto.status,
    deviceId: dto.device_id,
    modelName: dto.model_name,
    region: dto.region,
    raisedAt: dto.raised_at,
    lastSeenAt: dto.last_seen_at,
    occurrenceCount: dto.occurrence_count,
    contactAttempts: dto.contact_attempts,
    handler: dto.handler,
    sla: {
      dueAt: dto.sla.due_at,
      warningAt: dto.sla.warning_at,
      stoppedAt: dto.sla.stopped_at,
    },
    ticket: dto.ticket
      ? {
          id: dto.ticket.id,
          code: dto.ticket.code,
          status: dto.ticket.status,
          assignmentState: dto.ticket.assignment_state,
        }
      : null,
  };
}

export function mapAlertPage(dto: AlertPageDto): PageResponse<Alert> {
  return {
    items: dto.items.map(mapAlert),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}

export function mapAlertCounts(dto: {
  open: number;
  critical_open: number;
  overdue: number;
  mine: number;
}): AlertCounts {
  return {
    open: dto.open,
    criticalOpen: dto.critical_open,
    overdue: dto.overdue,
    mine: dto.mine,
  };
}

export function mapAlertFilterOptions(dto: {
  regions: string[];
  models: string[];
}): AlertFilterOptions {
  return dto;
}

export function mapAlertDetail(dto: AlertDetailDto): AlertDetail {
  return {
    ...mapAlert(dto),
    closeResult: dto.close_result,
    declineReason: dto.decline_reason,
    suggestedServiceType: dto.suggested_service_type,
    device: {
      connectionStatus: dto.device.connection_status,
      warrantyStatus: dto.device.warranty_status,
      cores: dto.device.cores.map((core) => ({
        position: core.position,
        coreName: core.core_name,
        usedPercent: core.used_percent,
        overThreshold: core.over_threshold,
      })),
    },
    customer: dto.customer,
    ticketDetail: dto.ticket_detail
      ? {
          serviceType: dto.ticket_detail.service_type,
          technician: dto.ticket_detail.technician,
          appointmentDate: dto.ticket_detail.appointment_date,
          appointmentSlot: dto.ticket_detail.appointment_slot,
          contactName: dto.ticket_detail.contact_name,
          contactPhone: dto.ticket_detail.contact_phone,
          address: dto.ticket_detail.address,
          technicianNote: dto.ticket_detail.technician_note,
        }
      : null,
    siblingAlerts: dto.sibling_alerts.map((alert) => ({
      id: alert.id,
      name: alert.name,
      errorCode: alert.error_code,
      severity: alert.severity,
      status: alert.status,
    })),
    otherOpenTicketCount: dto.other_open_ticket_count,
    history: dto.history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.actor_name,
      occurredAt: entry.occurred_at,
      fromStatus: entry.from_status,
      toStatus: entry.to_status,
      note: entry.note,
    })),
  };
}

export function mapTechnicianSuggestions(
  dto: TechnicianSuggestionsDto
): TechnicianSuggestions {
  return {
    station: dto.station,
    technicians: dto.technicians.map((technician) => ({
      id: technician.id,
      name: technician.name,
      specialty: technician.specialty,
      freeInSlot: technician.free_in_slot,
      ticketsToday: technician.tickets_today,
      rating: technician.rating,
    })),
  };
}
