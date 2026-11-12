import { HttpResponse, http } from 'msw';

import { isPortalRole } from '@/core/auth/types';
import i18n from '@/core/i18n';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { customerMockData } from '@/features/customers/mocks/customerMockData';
import {
  getSystemConfigParams,
  listMembersWithCapability,
  recordAudit,
} from '@/features/system/mocks/systemHandlers';
import { deviceCoreLayouts } from '@/mocks/fixtures/deviceCoreCatalog';
import { deviceFixtures } from '@/mocks/fixtures/devices';
import {
  alertErrorCatalog,
  alertSeeds,
  stationFixtures,
  technicianFixtures,
  type TechnicianMockBehavior,
} from '@/mocks/fixtures/alerts';
import { randomId } from '@/shared/lib/id';

import {
  ALERT_OPEN_STATUSES,
  APPOINTMENT_SLOTS,
  type AlertStatus,
  type AppointmentSlot,
  type AssignmentState,
  type HistoryAction,
  type ServiceType,
  type TicketStatus,
} from '../constants/alertEnums';
import type { AlertDetailDto } from '../schemas/alertSchemas';
import { getSlaState } from '../utils/alertSla';

const roleKey = 'cms-portal:mock-auth-role';
const userKey = 'cms-portal:mock-auth-user';
const ACCEPT_AFTER_MS = 8_000;
const DECLINE_AFTER_MS = 8_000;
const EXPIRE_AFTER_MS = 30_000;
const STAGE_ADVANCE_MS = 10_000;
const CANCEL_AFTER_MS = 15_000;
const SYSTEM_ACTOR = 'Hệ thống';

interface StoredAlert extends AlertDetailDto {
  recoversAfterMs?: number;
  recovered: boolean;
}
interface StoredTicket {
  id: string;
  code: string;
  deviceId: string;
  alertIds: string[];
  status: TicketStatus;
  assignmentState: AssignmentState;
  serviceType: ServiceType;
  corePositions: string[];
  issueDescription?: string;
  contactName: string;
  contactPhone: string;
  address: string;
  appointmentDate: string;
  appointmentSlot: AppointmentSlot;
  technicianNote?: string;
  technicianId?: string;
  assignedAt?: number;
  acceptedAt?: number;
  mockBehavior?: TechnicianMockBehavior;
}

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}
function actor(): { id: string; fullName: string } {
  const id = localStorage.getItem(userKey) ?? 'anonymous';
  const member = listMembersWithCapability('alerts.read').find(
    (item) => item.id === id
  );
  const role = localStorage.getItem(roleKey);
  return {
    id,
    fullName:
      member?.name ??
      (role && isPortalRole(role)
        ? i18n.t(`roles.${role}`, { ns: 'common' })
        : '—'),
  };
}
function fail(status: number, code: string) {
  return HttpResponse.json(
    { code, message: i18n.t(`alerts:errors.${code}`) },
    { status }
  );
}

const handlers = listMembersWithCapability('alerts.handle');
const seedHandler = handlers[0] ?? {
  id: 'seed-handler',
  name: 'Nhân viên CSKH',
};
const raisedBase = Date.now();
const coreLayout = deviceCoreLayouts[0]?.positions ?? [];

function customerFor(deviceIndex: number) {
  const device = deviceFixtures[deviceIndex % deviceFixtures.length]!;
  if (!device.owner) return undefined;
  const customer = customerMockData[deviceIndex % customerMockData.length]!;
  return {
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
  };
}

const alertStore: StoredAlert[] = alertSeeds.map((seed) => {
  const device = deviceFixtures[seed.deviceIndex % deviceFixtures.length]!;
  const catalog = alertErrorCatalog[seed.catalogIndex]!;
  const status = seed.status ?? 'new';
  const raisedAt = new Date(raisedBase - seed.ageMs).toISOString();
  const customer = customerFor(seed.deviceIndex);
  const group = customer ? catalog.handlerGroup : 'technical';
  return {
    id: seed.id,
    name: catalog.name,
    error_code: catalog.errorCode,
    severity: catalog.severity,
    handler_group: group,
    status,
    device_id: device.device_id,
    model_name: device.model_name,
    region: device.region,
    raised_at: raisedAt,
    last_seen_at: raisedAt,
    occurrence_count: 1 + (seed.catalogIndex % 4),
    contact_attempts: seed.contactAttempts ?? 0,
    handler: status === 'new' ? null : seedHandler,
    sla: {
      due_at: null,
      warning_at: null,
      stopped_at: ['declined', 'closed', 'ticketed'].includes(status)
        ? raisedAt
        : null,
    },
    ticket: seed.seededTicket
      ? {
          id: 'ticket-seed',
          code: 'WT-SEED0001',
          status: 'tt5',
          assignment_state: 'accepted',
        }
      : null,
    close_result:
      status === 'closed' ? { kind: 'ticket_done', note: null } : null,
    decline_reason: status === 'declined' ? 'customer_refused' : null,
    suggested_service_type: catalog.suggestedServiceType,
    device: {
      connection_status: device.status,
      warranty_status: device.warranty_status,
      cores: coreLayout.map((core, index) => ({
        position: core.position,
        core_name: core.name,
        used_percent: 72 + index * 5,
        over_threshold: index < 2,
      })),
    },
    ...(customer && { customer }),
    ticket_detail: seed.seededTicket
      ? {
          service_type: 'repair',
          technician: {
            id: technicianFixtures[0]!.id,
            name: technicianFixtures[0]!.name,
          },
          appointment_date: new Date().toISOString().slice(0, 10),
          appointment_slot: '10:00-12:00',
          contact_name: customer?.name ?? '',
          contact_phone: customer?.phone ?? '',
          address: customer?.address ?? '',
          technician_note: 'Seed ticket',
        }
      : null,
    sibling_alerts: [],
    other_open_ticket_count: 0,
    history: [],
    ...(seed.recoversAfterMs && { recoversAfterMs: seed.recoversAfterMs }),
    recovered: false,
  };
});

const ticketStore: StoredTicket[] = [
  {
    id: 'ticket-seed',
    code: 'WT-SEED0001',
    deviceId: alertStore[5]!.device_id,
    alertIds: [alertStore[5]!.id],
    status: 'tt5',
    assignmentState: 'accepted',
    serviceType: 'repair',
    corePositions: [],
    issueDescription: alertStore[5]!.name,
    contactName: alertStore[5]!.customer?.name ?? '',
    contactPhone: alertStore[5]!.customer?.phone ?? '',
    address: alertStore[5]!.customer?.address ?? '',
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentSlot: '10:00-12:00',
    technicianId: technicianFixtures[0]!.id,
    mockBehavior: 'accept',
  },
];

function appendHistory(
  alert: StoredAlert,
  action: HistoryAction,
  from: AlertStatus | null,
  to: AlertStatus | null,
  actorName: string,
  note?: string
) {
  alert.history.unshift({
    id: randomId(),
    action,
    actor_name: actorName,
    occurred_at: new Date().toISOString(),
    from_status: from,
    to_status: to,
    ...(note && { note }),
  });
}
function auditAutomatic(
  alert: StoredAlert,
  action: HistoryAction,
  before: AlertStatus,
  after: AlertStatus
) {
  appendHistory(alert, action, before, after, SYSTEM_ACTOR);
  recordAudit(null, {
    module: 'alerts',
    action,
    target: alert.id,
    before: { status: before },
    after: { status: after },
    actorName: SYSTEM_ACTOR,
  });
}
function setTicketSummary(ticket: StoredTicket) {
  for (const id of ticket.alertIds) {
    const alert = alertStore.find((item) => item.id === id);
    if (alert)
      alert.ticket = {
        id: ticket.id,
        code: ticket.code,
        status: ticket.status,
        assignment_state: ticket.assignmentState,
      };
  }
}
function materialize() {
  const now = Date.now();
  for (const ticket of ticketStore) {
    if (!ticket.assignedAt || !ticket.mockBehavior) continue;
    const elapsed = now - ticket.assignedAt;
    if (
      ticket.mockBehavior === 'decline' &&
      elapsed >= DECLINE_AFTER_MS &&
      ticket.assignmentState === 'pending'
    ) {
      ticket.assignmentState = 'declined';
      for (const id of ticket.alertIds) {
        const alert = alertStore.find((item) => item.id === id);
        if (alert)
          appendHistory(
            alert,
            'technician_declined',
            alert.status,
            alert.status,
            SYSTEM_ACTOR
          );
      }
    } else if (
      ticket.mockBehavior === 'ignore' &&
      elapsed >= EXPIRE_AFTER_MS &&
      ticket.assignmentState === 'pending'
    ) {
      ticket.assignmentState = 'expired';
      for (const id of ticket.alertIds) {
        const alert = alertStore.find((item) => item.id === id);
        if (alert)
          appendHistory(
            alert,
            'technician_expired',
            alert.status,
            alert.status,
            SYSTEM_ACTOR
          );
      }
    } else if (
      (ticket.mockBehavior === 'accept' ||
        ticket.mockBehavior === 'accept_then_cancel') &&
      elapsed >= ACCEPT_AFTER_MS &&
      ticket.assignmentState === 'pending'
    ) {
      ticket.assignmentState = 'accepted';
      ticket.status = 'tt3';
      ticket.acceptedAt = ticket.assignedAt + ACCEPT_AFTER_MS;
    }
    if (ticket.assignmentState === 'accepted' && ticket.acceptedAt) {
      if (
        ticket.mockBehavior === 'accept_then_cancel' &&
        now - ticket.acceptedAt >= CANCEL_AFTER_MS
      )
        ticket.status = 'cancelled';
      else if (ticket.mockBehavior === 'accept')
        ticket.status =
          `tt${Math.min(7, 3 + Math.floor((now - ticket.acceptedAt) / STAGE_ADVANCE_MS))}` as TicketStatus;
    }
    if (ticket.status === 'tt7') {
      for (const id of ticket.alertIds) {
        const alert = alertStore.find((item) => item.id === id);
        if (alert && alert.status !== 'closed') {
          const before = alert.status;
          alert.status = 'closed';
          alert.close_result = { kind: 'ticket_done', note: null };
          auditAutomatic(alert, 'closed_ticket_done', before, 'closed');
        }
      }
    } else if (ticket.status === 'cancelled') {
      for (const id of ticket.alertIds) {
        const alert = alertStore.find((item) => item.id === id);
        if (alert?.ticket) {
          const before = alert.status;
          alert.status = 'acknowledged';
          alert.ticket = null;
          alert.ticket_detail = null;
          appendHistory(
            alert,
            'ticket_cancelled',
            before,
            'acknowledged',
            SYSTEM_ACTOR
          );
        }
      }
    }
    setTicketSummary(ticket);
  }
  if (getSystemConfigParams().alert_auto_close)
    for (const alert of alertStore) {
      if (
        alert.recoversAfterMs &&
        !alert.ticket &&
        !alert.recovered &&
        ['new', 'acknowledged', 'unreachable'].includes(alert.status) &&
        now - Date.parse(alert.raised_at) >= alert.recoversAfterMs
      ) {
        const before = alert.status;
        alert.status = 'closed';
        alert.close_result = { kind: 'device_recovered', note: null };
        alert.recovered = true;
        auditAutomatic(alert, 'closed_recovered', before, 'closed');
      }
    }
}

function withSla(alert: StoredAlert): StoredAlert {
  const minutes = getSystemConfigParams().sla_by_severity[alert.severity];
  if (minutes === null)
    return { ...alert, sla: { ...alert.sla, due_at: null, warning_at: null } };
  const due = Date.parse(alert.raised_at) + minutes * 60_000;
  return {
    ...alert,
    sla: {
      ...alert.sla,
      due_at: new Date(due).toISOString(),
      warning_at: new Date(due - minutes * 60_000 * 0.2).toISOString(),
    },
  };
}
function detailForRole(source: StoredAlert): AlertDetailDto {
  const alert = withSla(source);
  const siblings = alertStore.filter(
    (item) =>
      item.id !== alert.id &&
      item.device_id === alert.device_id &&
      item.handler_group === 'cskh' &&
      ['new', 'acknowledged', 'unreachable'].includes(item.status)
  );
  const ticket = alert.ticket
    ? ticketStore.find((item) => item.id === alert.ticket?.id)
    : undefined;
  const result: AlertDetailDto = {
    ...alert,
    sibling_alerts: siblings.map(
      ({ id, name, error_code, severity, status }) => ({
        id,
        name,
        error_code,
        severity,
        status,
      })
    ),
    other_open_ticket_count: ticketStore.filter(
      (item) =>
        item.deviceId === alert.device_id &&
        item.id !== ticket?.id &&
        !['tt9', 'cancelled'].includes(item.status)
    ).length,
  };
  if (!allowed('device.pii.full')) {
    delete result.customer;
    result.history = result.history.map((entry) => {
      const visible = { ...entry };
      delete visible.note;
      return visible;
    });
    if (result.ticket_detail) {
      result.ticket_detail = { ...result.ticket_detail };
      delete result.ticket_detail.contact_name;
      delete result.ticket_detail.contact_phone;
      delete result.ticket_detail.address;
    }
  }
  if (!allowed('service.read') && result.ticket_detail) {
    result.ticket_detail = { ...result.ticket_detail };
    delete result.ticket_detail.technician;
    delete result.ticket_detail.appointment_date;
    delete result.ticket_detail.appointment_slot;
  }
  if (!allowed('service.write') && result.ticket_detail) {
    result.ticket_detail = { ...result.ticket_detail };
    delete result.ticket_detail.technician_note;
  }
  return result;
}
function listDto(alert: StoredAlert) {
  const visible = withSla(alert);
  return {
    id: visible.id,
    name: visible.name,
    error_code: visible.error_code,
    severity: visible.severity,
    handler_group: visible.handler_group,
    status: visible.status,
    device_id: visible.device_id,
    model_name: visible.model_name,
    region: visible.region,
    raised_at: visible.raised_at,
    last_seen_at: visible.last_seen_at,
    occurrence_count: visible.occurrence_count,
    contact_attempts: visible.contact_attempts,
    handler: visible.handler,
    sla: visible.sla,
    ticket: visible.ticket,
  };
}
function filtered(url: URL, counts = false) {
  const search = url.searchParams.get('search')?.toLocaleLowerCase();
  const current = actor();
  return alertStore.filter((alert) => {
    if (
      !counts &&
      !url.searchParams.has('status') &&
      url.searchParams.get('include_closed') !== '1' &&
      !ALERT_OPEN_STATUSES.includes(
        alert.status as (typeof ALERT_OPEN_STATUSES)[number]
      )
    )
      return false;
    const pairs: [string, string][] = [
      ['severity', alert.severity],
      ['status', alert.status],
      ['handler_group', alert.handler_group],
      ['region', alert.region],
      ['model', alert.model_name],
    ];
    if (
      pairs.some(
        ([key, value]) =>
          url.searchParams.get(key) && url.searchParams.get(key) !== value
      )
    )
      return false;
    if (
      search &&
      !alert.device_id.toLocaleLowerCase().includes(search) &&
      !alert.error_code.toLocaleLowerCase().includes(search)
    )
      return false;
    if (
      url.searchParams.get('mine') === '1' &&
      alert.handler?.id !== current.id
    )
      return false;
    if (
      url.searchParams.get('overdue') === '1' &&
      getSlaState(
        {
          dueAt: withSla(alert).sla.due_at,
          warningAt: withSla(alert).sla.warning_at,
          stoppedAt: alert.sla.stopped_at,
        },
        Date.now()
      ) !== 'overdue'
    )
      return false;
    const raisedDate = alert.raised_at.slice(0, 10);
    return (
      (!url.searchParams.get('date_from') ||
        raisedDate >= url.searchParams.get('date_from')!) &&
      (!url.searchParams.get('date_to') ||
        raisedDate <= url.searchParams.get('date_to')!)
    );
  });
}
function findAlert(id: string) {
  return alertStore.find((item) => item.id === id);
}
function requireHandler(alert: StoredAlert) {
  return alert.handler?.id === actor().id;
}
function mutate(
  alert: StoredAlert,
  action: HistoryAction,
  nextStatus: AlertStatus,
  note?: string
) {
  const before = alert.status;
  alert.status = nextStatus;
  appendHistory(alert, action, before, nextStatus, actor().fullName, note);
  recordAudit(actor(), {
    module: 'alerts',
    action,
    target: alert.id,
    before: { status: before },
    after: { status: nextStatus },
    reason: note,
  });
}
function validateTicketBody(
  body: Record<string, unknown>,
  alert: StoredAlert
): string | undefined {
  if (
    typeof body.contact_name !== 'string' ||
    !body.contact_name.trim() ||
    typeof body.address !== 'string' ||
    !body.address.trim() ||
    typeof body.contact_phone !== 'string' ||
    !/^\d{9,11}$/.test(body.contact_phone)
  )
    return 'validation';
  if (
    typeof body.appointment_date !== 'string' ||
    body.appointment_date < new Date().toISOString().slice(0, 10) ||
    !APPOINTMENT_SLOTS.includes(body.appointment_slot as AppointmentSlot)
  )
    return 'validation';
  if (body.service_type === 'core_replacement') {
    if (
      !Array.isArray(body.core_positions) ||
      !body.core_positions.length ||
      body.core_positions.some(
        (position) =>
          !alert.device.cores.some((core) => core.position === position)
      )
    )
      return 'validation';
  } else if (
    typeof body.issue_description !== 'string' ||
    !body.issue_description.trim()
  )
    return 'validation';
}
function assign(ticket: StoredTicket, technicianId: string, reason?: string) {
  const technician = technicianFixtures.find(
    (item) => item.id === technicianId
  );
  if (!technician) return fail(404, 'not_found');
  if (technician.busySlots.includes(ticket.appointmentSlot))
    return fail(422, 'technician_unavailable');
  if (ticket.serviceType === 'repair' && technician.specialty !== 'repair')
    return fail(422, 'specialty_mismatch');
  const reassignment = ['declined', 'expired'].includes(ticket.assignmentState);
  if (reassignment && !reason?.trim()) return fail(422, 'validation');
  ticket.technicianId = technician.id;
  ticket.mockBehavior = technician.mockBehavior;
  ticket.assignedAt = Date.now();
  ticket.acceptedAt = undefined;
  ticket.assignmentState = 'pending';
  ticket.status = 'tt2';
  for (const id of ticket.alertIds) {
    const alert = findAlert(id);
    if (alert)
      appendHistory(
        alert,
        reassignment ? 'technician_reassigned' : 'technician_assigned',
        alert.status,
        alert.status,
        actor().fullName,
        reason
      );
  }
  recordAudit(actor(), {
    module: 'service_tickets',
    action: reassignment ? 'technician_reassigned' : 'technician_assigned',
    target: ticket.id,
    after: { technicianId },
    reason,
  });
}

export const alertHandlers = [
  http.get('/api/alerts', ({ request }) => {
    if (!allowed('alerts.read')) return fail(403, 'forbidden');
    materialize();
    const url = new URL(request.url);
    const severityRank = { critical: 0, medium: 1, low: 2 };
    const items = filtered(url).sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] ||
        a.raised_at.localeCompare(b.raised_at)
    );
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get('page_size')) || 20
    );
    return HttpResponse.json({
      items: items.slice((page - 1) * pageSize, page * pageSize).map(listDto),
      page,
      page_size: pageSize,
      total: items.length,
    });
  }),
  http.get('/api/alerts/counts', ({ request }) => {
    if (!allowed('alerts.read')) return fail(403, 'forbidden');
    materialize();
    const items = filtered(new URL(request.url), true);
    const me = actor().id;
    return HttpResponse.json({
      open: items.filter((item) =>
        ALERT_OPEN_STATUSES.includes(
          item.status as (typeof ALERT_OPEN_STATUSES)[number]
        )
      ).length,
      critical_open: items.filter(
        (item) =>
          item.severity === 'critical' &&
          ALERT_OPEN_STATUSES.includes(
            item.status as (typeof ALERT_OPEN_STATUSES)[number]
          )
      ).length,
      overdue: items.filter(
        (item) =>
          getSlaState(
            {
              dueAt: withSla(item).sla.due_at,
              warningAt: withSla(item).sla.warning_at,
              stoppedAt: item.sla.stopped_at,
            },
            Date.now()
          ) === 'overdue'
      ).length,
      mine: items.filter((item) => item.handler?.id === me).length,
    });
  }),
  http.get('/api/alerts/filter-options', () => {
    if (!allowed('alerts.read')) return fail(403, 'forbidden');
    materialize();
    return HttpResponse.json({
      regions: [...new Set(alertStore.map((item) => item.region))].sort(),
      models: [...new Set(alertStore.map((item) => item.model_name))].sort(),
    });
  }),
  http.get('/api/alerts/:id', ({ params }) => {
    if (!allowed('alerts.read')) return fail(403, 'forbidden');
    materialize();
    const alert = findAlert(String(params.id));
    return alert
      ? HttpResponse.json(detailForRole(alert))
      : fail(404, 'not_found');
  }),
  http.post('/api/alerts/:id/acknowledge', ({ params }) => {
    if (!allowed('alerts.handle')) return fail(403, 'forbidden');
    materialize();
    const alert = findAlert(String(params.id));
    if (!alert) return fail(404, 'not_found');
    if (alert.status !== 'new') return fail(409, 'already_handled');
    alert.handler = { id: actor().id, name: actor().fullName };
    mutate(alert, 'acknowledge', 'acknowledged');
    return HttpResponse.json(detailForRole(alert));
  }),
  http.post('/api/alerts/:id/takeover', ({ params }) => {
    if (!allowed('alerts.handle')) return fail(403, 'forbidden');
    materialize();
    const alert = findAlert(String(params.id));
    if (!alert) return fail(404, 'not_found');
    if (
      !['acknowledged', 'unreachable', 'ticketed'].includes(alert.status) ||
      !alert.handler ||
      alert.handler.id === actor().id
    )
      return fail(409, 'invalid_state');
    const before = alert.handler.name;
    alert.handler = { id: actor().id, name: actor().fullName };
    appendHistory(
      alert,
      'takeover',
      alert.status,
      alert.status,
      actor().fullName
    );
    recordAudit(actor(), {
      module: 'alerts',
      action: 'takeover',
      target: alert.id,
      before: { handler: before },
      after: { handler: actor().fullName },
    });
    return HttpResponse.json(detailForRole(alert));
  }),
  http.post('/api/alerts/:id/contact-results', async ({ params, request }) => {
    if (!allowed('alerts.handle')) return fail(403, 'forbidden');
    materialize();
    const alert = findAlert(String(params.id));
    if (!alert) return fail(404, 'not_found');
    if (!requireHandler(alert)) return fail(403, 'not_handler');
    if (
      alert.handler_group !== 'cskh' ||
      !['acknowledged', 'unreachable'].includes(alert.status)
    )
      return fail(409, 'invalid_state');
    const body = (await request.json().catch(() => null)) as {
      outcome?: string;
      reason_code?: string;
      note?: string;
    } | null;
    if (
      !body ||
      !['unreachable', 'declined'].includes(body.outcome ?? '') ||
      (body.outcome === 'declined' &&
        (!body.reason_code ||
          (body.reason_code === 'other' && !body.note?.trim())))
    )
      return fail(422, 'validation');
    alert.contact_attempts += 1;
    alert.sla.stopped_at ??= new Date().toISOString();
    if (body.outcome === 'unreachable')
      mutate(alert, 'contact_unreachable', 'unreachable', body.note);
    else {
      alert.decline_reason = body.reason_code as StoredAlert['decline_reason'];
      mutate(alert, 'contact_declined', 'declined', body.note);
    }
    return HttpResponse.json(detailForRole(alert));
  }),
  http.post('/api/alerts/:id/close', async ({ params, request }) => {
    if (!allowed('alerts.handle')) return fail(403, 'forbidden');
    materialize();
    const alert = findAlert(String(params.id));
    if (!alert) return fail(404, 'not_found');
    if (!requireHandler(alert)) return fail(403, 'not_handler');
    const body = (await request.json().catch(() => null)) as {
      result?: string;
    } | null;
    if (alert.handler_group !== 'technical' || alert.status !== 'acknowledged')
      return fail(409, 'invalid_state');
    if (!body?.result?.trim()) return fail(422, 'validation');
    alert.close_result = { kind: 'manual', note: body.result.trim() };
    alert.sla.stopped_at = new Date().toISOString();
    mutate(alert, 'closed_manual', 'closed', body.result.trim());
    return HttpResponse.json(detailForRole(alert));
  }),
  http.post('/api/alerts/:id/service-ticket', async ({ params, request }) => {
    if (!allowed('alerts.handle') || !allowed('service.write'))
      return fail(403, 'forbidden');
    materialize();
    const alert = findAlert(String(params.id));
    if (!alert) return fail(404, 'not_found');
    if (!requireHandler(alert)) return fail(403, 'not_handler');
    if (
      alert.handler_group !== 'cskh' ||
      !['acknowledged', 'unreachable'].includes(alert.status)
    )
      return fail(409, 'invalid_state');
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || validateTicketBody(body, alert))
      return fail(422, 'validation');
    const mergedIds = Array.isArray(body.merged_alert_ids)
      ? body.merged_alert_ids.filter(
          (id): id is string => typeof id === 'string'
        )
      : [];
    const merged = mergedIds.map(findAlert);
    if (
      merged.some(
        (item) =>
          !item ||
          item.device_id !== alert.device_id ||
          item.handler_group !== 'cskh' ||
          !['new', 'acknowledged', 'unreachable'].includes(item.status)
      )
    )
      return fail(422, 'validation');
    const ticket: StoredTicket = {
      id: randomId(),
      code: `WT-${randomId().slice(0, 8).toUpperCase()}`,
      deviceId: alert.device_id,
      alertIds: [alert.id, ...mergedIds],
      status: 'tt1',
      assignmentState: 'unassigned',
      serviceType: body.service_type as ServiceType,
      corePositions: body.core_positions as string[],
      ...(body.issue_description
        ? { issueDescription: String(body.issue_description) }
        : {}),
      contactName: String(body.contact_name),
      contactPhone: String(body.contact_phone),
      address: String(body.address),
      appointmentDate: String(body.appointment_date),
      appointmentSlot: body.appointment_slot as AppointmentSlot,
      ...(body.technician_note
        ? { technicianNote: String(body.technician_note) }
        : {}),
    };
    ticketStore.push(ticket);
    const now = new Date().toISOString();
    for (const current of [
      alert,
      ...merged.filter((item): item is StoredAlert => Boolean(item)),
    ]) {
      current.handler = { id: actor().id, name: actor().fullName };
      current.contact_attempts += 1;
      current.sla.stopped_at ??= now;
      mutate(
        current,
        current.id === alert.id ? 'ticket_created' : 'ticket_merged',
        'ticketed'
      );
    }
    if (typeof body.technician_id === 'string') {
      const error = assign(ticket, body.technician_id);
      if (error) {
        ticketStore.pop();
        return error;
      }
    }
    setTicketSummary(ticket);
    return HttpResponse.json(detailForRole(alert));
  }),
  http.get('/api/service-tickets/technician-suggestions', ({ request }) => {
    if (!allowed('service.write')) return fail(403, 'forbidden');
    materialize();
    const url = new URL(request.url);
    const alert = findAlert(url.searchParams.get('alert_id') ?? '');
    if (!alert) return fail(404, 'not_found');
    const slot = url.searchParams.get('appointment_slot') ?? '';
    const serviceType = url.searchParams.get('service_type');
    const station =
      stationFixtures.find((item) => item.region === alert.region) ??
      stationFixtures[0];
    const technicians = technicianFixtures
      .filter((item) => item.stationId === station.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        specialty: item.specialty,
        free_in_slot: !item.busySlots.includes(slot),
        tickets_today: item.ticketsToday,
        rating: item.rating,
      }))
      .sort(
        (a, b) =>
          Number(b.free_in_slot) - Number(a.free_in_slot) ||
          (serviceType === 'repair'
            ? Number(b.specialty === 'repair') -
              Number(a.specialty === 'repair')
            : 0) ||
          b.rating - a.rating
      );
    return HttpResponse.json({
      station: { id: station.id, name: station.name },
      technicians,
    });
  }),
  http.put(
    '/api/service-tickets/:ticketId/assignment',
    async ({ params, request }) => {
      if (!allowed('service.write')) return fail(403, 'forbidden');
      materialize();
      const ticket = ticketStore.find((item) => item.id === params.ticketId);
      if (!ticket) return fail(404, 'not_found');
      const alert = findAlert(ticket.alertIds[0]!);
      if (!alert || !requireHandler(alert)) return fail(403, 'not_handler');
      if (
        !['unassigned', 'declined', 'expired'].includes(ticket.assignmentState)
      )
        return fail(409, 'invalid_state');
      const body = (await request.json().catch(() => null)) as {
        technician_id?: string;
        reason?: string;
      } | null;
      if (!body?.technician_id) return fail(422, 'validation');
      const error = assign(ticket, body.technician_id, body.reason);
      if (error) return error;
      setTicketSummary(ticket);
      return new HttpResponse(null, { status: 204 });
    }
  ),
];
