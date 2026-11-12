import type { PortalTone } from '@/shared/components/portal';

function values<const T extends readonly { value: string }[]>(items: T) {
  return items.map(({ value }) => value) as {
    [K in keyof T]: T[K] extends { value: infer V } ? V : never;
  };
}

export const ALERT_SEVERITIES = [
  { value: 'critical', labelKey: 'severity.critical' },
  { value: 'medium', labelKey: 'severity.medium' },
  { value: 'low', labelKey: 'severity.low' },
] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]['value'];
export const ALERT_SEVERITY_VALUES = values(ALERT_SEVERITIES);

export const ALERT_STATUSES = [
  { value: 'new', labelKey: 'status.new' },
  { value: 'acknowledged', labelKey: 'status.acknowledged' },
  { value: 'unreachable', labelKey: 'status.unreachable' },
  { value: 'ticketed', labelKey: 'status.ticketed' },
  { value: 'declined', labelKey: 'status.declined' },
  { value: 'closed', labelKey: 'status.closed' },
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number]['value'];
export const ALERT_STATUS_VALUES = values(ALERT_STATUSES);

export const ALERT_HANDLER_GROUPS = [
  { value: 'cskh', labelKey: 'group.cskh' },
  { value: 'technical', labelKey: 'group.technical' },
] as const;
export type AlertHandlerGroup = (typeof ALERT_HANDLER_GROUPS)[number]['value'];
export const ALERT_HANDLER_GROUP_VALUES = values(ALERT_HANDLER_GROUPS);

export const DECLINE_REASONS = [
  { value: 'guided_self_fix', labelKey: 'declineReason.guided_self_fix' },
  { value: 'customer_fixed', labelKey: 'declineReason.customer_fixed' },
  { value: 'customer_refused', labelKey: 'declineReason.customer_refused' },
  { value: 'false_alarm', labelKey: 'declineReason.false_alarm' },
  { value: 'other', labelKey: 'declineReason.other' },
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number]['value'];
export const DECLINE_REASON_VALUES = values(DECLINE_REASONS);

export const SERVICE_TYPES = [
  { value: 'core_replacement', labelKey: 'serviceType.core_replacement' },
  { value: 'repair', labelKey: 'serviceType.repair' },
  { value: 'cleaning_check', labelKey: 'serviceType.cleaning_check' },
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number]['value'];
export const SERVICE_TYPE_VALUES = values(SERVICE_TYPES);

export const TICKET_STATUSES = [
  ...(
    ['tt1', 'tt2', 'tt3', 'tt4', 'tt5', 'tt6', 'tt7', 'tt8', 'tt9'] as const
  ).map((value) => ({ value, labelKey: `ticketStatus.${value}` })),
  { value: 'cancelled', labelKey: 'ticketStatus.cancelled' },
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number]['value'];
export const TICKET_STATUS_VALUES = values(TICKET_STATUSES);

export const ASSIGNMENT_STATES = [
  { value: 'unassigned', labelKey: 'assignment.unassigned' },
  { value: 'pending', labelKey: 'assignment.pending' },
  { value: 'accepted', labelKey: 'assignment.accepted' },
  { value: 'declined', labelKey: 'assignment.declined' },
  { value: 'expired', labelKey: 'assignment.expired' },
] as const;
export type AssignmentState = (typeof ASSIGNMENT_STATES)[number]['value'];
export const ASSIGNMENT_STATE_VALUES = values(ASSIGNMENT_STATES);

export const CLOSE_RESULT_KINDS = [
  { value: 'ticket_done', labelKey: 'closeResult.ticket_done' },
  { value: 'device_recovered', labelKey: 'closeResult.device_recovered' },
  { value: 'manual', labelKey: 'closeResult.manual' },
] as const;
export type CloseResultKind = (typeof CLOSE_RESULT_KINDS)[number]['value'];
export const CLOSE_RESULT_KIND_VALUES = values(CLOSE_RESULT_KINDS);

export const HISTORY_ACTIONS = [
  'acknowledge',
  'takeover',
  'contact_unreachable',
  'contact_declined',
  'ticket_created',
  'ticket_merged',
  'technician_assigned',
  'technician_reassigned',
  'technician_declined',
  'technician_expired',
  'ticket_cancelled',
  'closed_ticket_done',
  'closed_recovered',
  'closed_manual',
].map((value) => ({ value, labelKey: `history.${value}` })) as readonly {
  value: string;
  labelKey: string;
}[];
export type HistoryAction =
  | 'acknowledge'
  | 'takeover'
  | 'contact_unreachable'
  | 'contact_declined'
  | 'ticket_created'
  | 'ticket_merged'
  | 'technician_assigned'
  | 'technician_reassigned'
  | 'technician_declined'
  | 'technician_expired'
  | 'ticket_cancelled'
  | 'closed_ticket_done'
  | 'closed_recovered'
  | 'closed_manual';
export const HISTORY_ACTION_VALUES = HISTORY_ACTIONS.map(
  ({ value }) => value
) as [HistoryAction, ...HistoryAction[]];

export const TECHNICIAN_SPECIALTIES = [
  { value: 'general', labelKey: 'specialty.general' },
  { value: 'repair', labelKey: 'specialty.repair' },
] as const;
export type TechnicianSpecialty =
  (typeof TECHNICIAN_SPECIALTIES)[number]['value'];
export const TECHNICIAN_SPECIALTY_VALUES = values(TECHNICIAN_SPECIALTIES);

export const ALERT_OPEN_STATUSES = [
  'new',
  'acknowledged',
  'unreachable',
  'ticketed',
] as const satisfies readonly AlertStatus[];

export const APPOINTMENT_SLOTS = [
  '08:00-10:00',
  '10:00-12:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
] as const;
export type AppointmentSlot = (typeof APPOINTMENT_SLOTS)[number];

export const ALERT_SEVERITY_TONES: Record<AlertSeverity, PortalTone> = {
  critical: 'danger',
  medium: 'warning',
  low: 'water',
};
