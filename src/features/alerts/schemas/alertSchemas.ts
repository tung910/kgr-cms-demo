import { z } from 'zod';
import {
  ALERT_HANDLER_GROUP_VALUES,
  ALERT_SEVERITY_VALUES,
  ALERT_STATUS_VALUES,
  ASSIGNMENT_STATE_VALUES,
  CLOSE_RESULT_KIND_VALUES,
  DECLINE_REASON_VALUES,
  HISTORY_ACTION_VALUES,
  SERVICE_TYPE_VALUES,
  TECHNICIAN_SPECIALTY_VALUES,
  TICKET_STATUS_VALUES,
  type AlertHandlerGroup,
  type AlertSeverity,
  type AlertStatus,
  type AppointmentSlot,
  type DeclineReason,
  type ServiceType,
} from '../constants/alertEnums';

const isoDateTime = z.string().datetime({ offset: true });
const personDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});
export const alertSlaDtoSchema = z.object({
  due_at: isoDateTime.nullable(),
  warning_at: isoDateTime.nullable(),
  stopped_at: isoDateTime.nullable(),
});
export const alertTicketSummaryDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: z.enum(TICKET_STATUS_VALUES),
  assignment_state: z.enum(ASSIGNMENT_STATE_VALUES),
});
export const alertDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  error_code: z.string().min(1),
  severity: z.enum(ALERT_SEVERITY_VALUES),
  handler_group: z.enum(ALERT_HANDLER_GROUP_VALUES),
  status: z.enum(ALERT_STATUS_VALUES),
  device_id: z.string().min(1),
  model_name: z.string().min(1),
  region: z.string().min(1),
  raised_at: isoDateTime,
  last_seen_at: isoDateTime,
  occurrence_count: z.number().int().positive(),
  contact_attempts: z.number().int().nonnegative(),
  handler: personDtoSchema.nullable(),
  sla: alertSlaDtoSchema,
  ticket: alertTicketSummaryDtoSchema.nullable(),
});
export const alertPageDtoSchema = z.object({
  items: z.array(alertDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export const alertCountsDtoSchema = z.object({
  open: z.number().int().nonnegative(),
  critical_open: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  mine: z.number().int().nonnegative(),
});
export const alertFilterOptionsDtoSchema = z.object({
  regions: z.array(z.string()),
  models: z.array(z.string()),
});
export const alertDetailDtoSchema = alertDtoSchema.extend({
  close_result: z
    .object({
      kind: z.enum(CLOSE_RESULT_KIND_VALUES),
      note: z.string().nullable(),
    })
    .nullable(),
  decline_reason: z.enum(DECLINE_REASON_VALUES).nullable(),
  suggested_service_type: z.enum(SERVICE_TYPE_VALUES),
  device: z.object({
    connection_status: z.enum(['online', 'offline']).nullable(),
    warranty_status: z.enum(['active', 'expiring', 'expired', 'none']),
    cores: z.array(
      z.object({
        position: z.string().min(1),
        core_name: z.string().min(1),
        used_percent: z.number(),
        over_threshold: z.boolean(),
      })
    ),
  }),
  customer: z
    .object({ name: z.string(), phone: z.string(), address: z.string() })
    .optional(),
  ticket_detail: z
    .object({
      service_type: z.enum(SERVICE_TYPE_VALUES),
      technician: personDtoSchema.nullable().optional(),
      appointment_date: z.iso.date().optional(),
      appointment_slot: z.string().optional(),
      contact_name: z.string().optional(),
      contact_phone: z.string().optional(),
      address: z.string().optional(),
      technician_note: z.string().optional(),
    })
    .nullable(),
  sibling_alerts: z.array(
    alertDtoSchema.pick({
      id: true,
      name: true,
      error_code: true,
      severity: true,
      status: true,
    })
  ),
  other_open_ticket_count: z.number().int().nonnegative(),
  history: z.array(
    z.object({
      id: z.string().min(1),
      action: z.enum(HISTORY_ACTION_VALUES),
      actor_name: z.string().min(1),
      occurred_at: isoDateTime,
      from_status: z.enum(ALERT_STATUS_VALUES).nullable(),
      to_status: z.enum(ALERT_STATUS_VALUES).nullable(),
      note: z.string().optional(),
    })
  ),
});
export const technicianSuggestionsDtoSchema = z.object({
  station: personDtoSchema,
  technicians: z.array(
    personDtoSchema.extend({
      specialty: z.enum(TECHNICIAN_SPECIALTY_VALUES),
      free_in_slot: z.boolean(),
      tickets_today: z.number().int().nonnegative(),
      rating: z.number().min(0).max(5),
    })
  ),
});

export type AlertDto = z.infer<typeof alertDtoSchema>;
export type AlertPageDto = z.infer<typeof alertPageDtoSchema>;
export type AlertDetailDto = z.infer<typeof alertDetailDtoSchema>;
export type TechnicianSuggestionsDto = z.infer<
  typeof technicianSuggestionsDtoSchema
>;
export interface AlertSla {
  dueAt: string | null;
  warningAt: string | null;
  stoppedAt: string | null;
}
export interface AlertTicketSummary {
  id: string;
  code: string;
  status: z.infer<typeof alertTicketSummaryDtoSchema>['status'];
  assignmentState: z.infer<
    typeof alertTicketSummaryDtoSchema
  >['assignment_state'];
}
export interface Alert {
  id: string;
  name: string;
  errorCode: string;
  severity: AlertSeverity;
  handlerGroup: AlertHandlerGroup;
  status: AlertStatus;
  deviceId: string;
  modelName: string;
  region: string;
  raisedAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  contactAttempts: number;
  handler: { id: string; name: string } | null;
  sla: AlertSla;
  ticket: AlertTicketSummary | null;
}
export interface AlertDetail extends Alert {
  closeResult: {
    kind: z.infer<typeof alertDetailDtoSchema>['close_result'] extends infer T
      ? T extends { kind: infer K }
        ? K
        : never
      : never;
    note: string | null;
  } | null;
  declineReason: DeclineReason | null;
  suggestedServiceType: ServiceType;
  device: {
    connectionStatus: 'online' | 'offline' | null;
    warrantyStatus: 'active' | 'expiring' | 'expired' | 'none';
    cores: {
      position: string;
      coreName: string;
      usedPercent: number;
      overThreshold: boolean;
    }[];
  };
  customer?: { name: string; phone: string; address: string };
  ticketDetail: {
    serviceType: ServiceType;
    technician?: { id: string; name: string } | null;
    appointmentDate?: string;
    appointmentSlot?: string;
    contactName?: string;
    contactPhone?: string;
    address?: string;
    technicianNote?: string;
  } | null;
  siblingAlerts: Pick<
    Alert,
    'id' | 'name' | 'errorCode' | 'severity' | 'status'
  >[];
  otherOpenTicketCount: number;
  history: {
    id: string;
    action: z.infer<typeof alertDetailDtoSchema>['history'][number]['action'];
    actorName: string;
    occurredAt: string;
    fromStatus: AlertStatus | null;
    toStatus: AlertStatus | null;
    note?: string;
  }[];
}
export interface AlertCounts {
  open: number;
  criticalOpen: number;
  overdue: number;
  mine: number;
}
export interface AlertFilterOptions {
  regions: string[];
  models: string[];
}
export interface TechnicianSuggestion {
  id: string;
  name: string;
  specialty: z.infer<
    typeof technicianSuggestionsDtoSchema
  >['technicians'][number]['specialty'];
  freeInSlot: boolean;
  ticketsToday: number;
  rating: number;
}
export interface TechnicianSuggestions {
  station: { id: string; name: string };
  technicians: TechnicianSuggestion[];
}
export interface AlertListFilters {
  search: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  group?: AlertHandlerGroup;
  region?: string;
  model?: string;
  dateFrom?: string;
  dateTo?: string;
  mine?: boolean;
  overdue?: boolean;
  includeClosed?: boolean;
  page: number;
  pageSize: number;
}
export type ContactResultInput =
  | { outcome: 'unreachable'; note?: string }
  | { outcome: 'declined'; reasonCode: DeclineReason; note?: string };
export interface CreateTicketInput {
  serviceType: ServiceType;
  corePositions: string[];
  issueDescription?: string;
  contactName: string;
  contactPhone: string;
  address: string;
  appointmentDate: string;
  appointmentSlot: AppointmentSlot;
  technicianNote?: string;
  mergedAlertIds: string[];
  technicianId?: string;
}
export interface AssignTechnicianInput {
  technicianId: string;
  reason?: string;
}
export interface TechnicianSuggestionParams {
  alertId: string;
  appointmentDate: string;
  appointmentSlot: AppointmentSlot;
  serviceType: ServiceType;
}
