import { ApiError } from '@/core/api/error';
import { apiClient } from '@/core/api/apiClient';
import i18n from '@/core/i18n';
import type { PageResponse } from '@/shared/types/pagination';
import {
  mapAlertCounts,
  mapAlertDetail,
  mapAlertFilterOptions,
  mapAlertPage,
  mapTechnicianSuggestions,
} from './alertMapper';
import {
  alertCountsDtoSchema,
  alertDetailDtoSchema,
  alertFilterOptionsDtoSchema,
  alertPageDtoSchema,
  technicianSuggestionsDtoSchema,
  type Alert,
  type AlertCounts,
  type AlertDetail,
  type AlertFilterOptions,
  type AlertListFilters,
  type AssignTechnicianInput,
  type ContactResultInput,
  type CreateTicketInput,
  type TechnicianSuggestionParams,
  type TechnicianSuggestions,
} from '../schemas/alertSchemas';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('alerts:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function filterParams(
  filters: AlertListFilters,
  counts = false
): URLSearchParams {
  const params = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ['search', filters.search.trim() || undefined],
    ['severity', filters.severity],
    ['handler_group', filters.group],
    ['region', filters.region?.trim() || undefined],
    ['model', filters.model?.trim() || undefined],
    ['date_from', filters.dateFrom],
    ['date_to', filters.dateTo],
  ];
  if (!counts) entries.push(['status', filters.status]);
  for (const [key, value] of entries) if (value) params.set(key, value);
  if (!counts) {
    if (filters.mine) params.set('mine', '1');
    if (filters.overdue) params.set('overdue', '1');
    if (filters.page > 0) params.set('page', String(filters.page));
    if (filters.pageSize > 0) params.set('page_size', String(filters.pageSize));
  }
  if (filters.includeClosed) params.set('include_closed', '1');
  return params;
}

async function parseDetail(response: unknown): Promise<AlertDetail> {
  const parsed = alertDetailDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapAlertDetail(parsed.data);
}

export async function getAlerts(
  filters: AlertListFilters,
  signal?: AbortSignal
): Promise<PageResponse<Alert>> {
  const response = await apiClient.get<unknown>(
    `/alerts?${filterParams(filters)}`,
    { signal }
  );
  const parsed = alertPageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapAlertPage(parsed.data);
}
export async function getAllAlerts(
  filters: AlertListFilters,
  signal?: AbortSignal
): Promise<Alert[]> {
  const items: Alert[] = [];
  let page = 1;
  while (true) {
    const result = await getAlerts({ ...filters, page, pageSize: 100 }, signal);
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
    page += 1;
  }
}
export async function getAlertCounts(
  filters: AlertListFilters,
  signal?: AbortSignal
): Promise<AlertCounts> {
  const query = filterParams(filters, true).toString();
  const response = await apiClient.get<unknown>(
    query ? `/alerts/counts?${query}` : '/alerts/counts',
    { signal }
  );
  const parsed = alertCountsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapAlertCounts(parsed.data);
}
export async function getAlertFilterOptions(
  signal?: AbortSignal
): Promise<AlertFilterOptions> {
  const parsed = alertFilterOptionsDtoSchema.safeParse(
    await apiClient.get<unknown>('/alerts/filter-options', { signal })
  );
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapAlertFilterOptions(parsed.data);
}
export async function getAlert(
  alertId: string,
  signal?: AbortSignal
): Promise<AlertDetail> {
  return parseDetail(
    await apiClient.get<unknown>(`/alerts/${encodeURIComponent(alertId)}`, {
      signal,
    })
  );
}
export async function acknowledgeAlert(alertId: string): Promise<AlertDetail> {
  return parseDetail(
    await apiClient.post<unknown>(
      `/alerts/${encodeURIComponent(alertId)}/acknowledge`,
      {}
    )
  );
}
export async function takeOverAlert(alertId: string): Promise<AlertDetail> {
  return parseDetail(
    await apiClient.post<unknown>(
      `/alerts/${encodeURIComponent(alertId)}/takeover`,
      {}
    )
  );
}
export async function recordContactResult(
  alertId: string,
  input: ContactResultInput
): Promise<AlertDetail> {
  return parseDetail(
    await apiClient.post<unknown>(
      `/alerts/${encodeURIComponent(alertId)}/contact-results`,
      {
        outcome: input.outcome,
        ...('reasonCode' in input ? { reason_code: input.reasonCode } : {}),
        ...(input.note ? { note: input.note } : {}),
      }
    )
  );
}
export async function closeAlert(
  alertId: string,
  result: string
): Promise<AlertDetail> {
  return parseDetail(
    await apiClient.post<unknown>(
      `/alerts/${encodeURIComponent(alertId)}/close`,
      { result }
    )
  );
}
export async function createTicketFromAlert(
  alertId: string,
  input: CreateTicketInput
): Promise<AlertDetail> {
  return parseDetail(
    await apiClient.post<unknown>(
      `/alerts/${encodeURIComponent(alertId)}/service-ticket`,
      {
        service_type: input.serviceType,
        core_positions: input.corePositions,
        issue_description: input.issueDescription,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        address: input.address,
        appointment_date: input.appointmentDate,
        appointment_slot: input.appointmentSlot,
        technician_note: input.technicianNote,
        merged_alert_ids: input.mergedAlertIds,
        technician_id: input.technicianId,
      }
    )
  );
}
export async function getTechnicianSuggestions(
  params: TechnicianSuggestionParams,
  signal?: AbortSignal
): Promise<TechnicianSuggestions> {
  const query = new URLSearchParams({
    alert_id: params.alertId,
    appointment_date: params.appointmentDate,
    appointment_slot: params.appointmentSlot,
    service_type: params.serviceType,
  });
  const parsed = technicianSuggestionsDtoSchema.safeParse(
    await apiClient.get<unknown>(
      `/service-tickets/technician-suggestions?${query}`,
      { signal }
    )
  );
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapTechnicianSuggestions(parsed.data);
}
export async function assignTechnician(
  ticketId: string,
  input: AssignTechnicianInput
): Promise<void> {
  await apiClient.put<unknown>(
    `/service-tickets/${encodeURIComponent(ticketId)}/assignment`,
    {
      technician_id: input.technicianId,
      ...(input.reason ? { reason: input.reason } : {}),
    }
  );
}
