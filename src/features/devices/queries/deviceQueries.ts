import { queryOptions } from '@tanstack/react-query';

import {
  getDevice,
  getDeviceFirmwareOptions,
  getDeviceStatusCounts,
  getDevices,
} from '../api/deviceApi';
import {
  getAlertHistory,
  getCommandLog,
  getConnectivityHistory,
  getCoreAlerts,
  getDeviceOwnerProfile,
  getFilterCoreStatuses,
  getFilterChangeHistory,
  getOtaHistory,
  searchOwnerCandidates,
  getServiceHistory,
  getTelemetryHistory,
  listDiagnosticsJobs,
} from '../api/deviceDetailApi';
import type { TelemetryRange } from '../schemas/deviceDetailSchemas';
import type { DeviceListFilters } from '../schemas/deviceSchemas';

export const deviceQueries = {
  all: ['devices'] as const,
  list: (filters: DeviceListFilters) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'list', filters] as const,
      queryFn: ({ signal }) => getDevices(filters, signal),
    }),
  // Fleet-wide breakdown for the stat cards. The key drops status and
  // pagination so paging or switching status reuses the cached counts.
  statusCounts: (filters: DeviceListFilters) => {
    const countFilters = {
      search: filters.search,
      model: filters.model,
      region: filters.region,
      customerId: filters.customerId,
      coreLife: filters.coreLife,
      offlineDuration: filters.offlineDuration,
      errorType: filters.errorType,
      moduleFirmware: filters.moduleFirmware,
      activatedFrom: filters.activatedFrom,
      activatedTo: filters.activatedTo,
    };
    return queryOptions({
      queryKey: [...deviceQueries.all, 'status-counts', countFilters] as const,
      queryFn: ({ signal }) => getDeviceStatusCounts(countFilters, signal),
    });
  },
  firmwareOptions: () =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'firmware-options'] as const,
      queryFn: ({ signal }) => getDeviceFirmwareOptions(signal),
      staleTime: 5 * 60 * 1000,
    }),
  detail: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'detail', deviceId] as const,
      // Real-time block (POR-010) — refetch every 30s while the tab is open.
      refetchInterval: 30_000,
      queryFn: ({ signal }) => getDevice(deviceId, signal),
    }),
  alertHistory: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'alerts', deviceId] as const,
      queryFn: ({ signal }) => getAlertHistory(deviceId, signal),
    }),
  connectivityHistory: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'connectivity', deviceId] as const,
      queryFn: ({ signal }) => getConnectivityHistory(deviceId, signal),
    }),
  filterChangeHistory: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'filter-changes', deviceId] as const,
      queryFn: ({ signal }) => getFilterChangeHistory(deviceId, signal),
    }),
  otaHistory: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'ota-history', deviceId] as const,
      queryFn: ({ signal }) => getOtaHistory(deviceId, signal),
    }),
  serviceHistory: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'service-history', deviceId] as const,
      queryFn: ({ signal }) => getServiceHistory(deviceId, signal),
    }),
  coreAlerts: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'core-alerts', deviceId] as const,
      queryFn: ({ signal }) => getCoreAlerts(deviceId, signal),
    }),
  diagnosticsJobs: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'diagnostics', deviceId] as const,
      queryFn: ({ signal }) => listDiagnosticsJobs(deviceId, signal),
    }),
  telemetryHistory: (deviceId: string, range: TelemetryRange) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'telemetry', deviceId, range] as const,
      queryFn: ({ signal }) => getTelemetryHistory(deviceId, range, signal),
    }),
  filterCores: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'filter-cores', deviceId] as const,
      queryFn: ({ signal }) => getFilterCoreStatuses(deviceId, signal),
    }),
  commandLog: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'commands', deviceId] as const,
      queryFn: ({ signal }) => getCommandLog(deviceId, signal),
    }),
  ownerProfile: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'owner', deviceId] as const,
      queryFn: ({ signal }) => getDeviceOwnerProfile(deviceId, signal),
    }),
  ownerCandidates: (deviceId: string, search: string) =>
    queryOptions({
      queryKey: [
        ...deviceQueries.all,
        'owner-candidates',
        deviceId,
        search.trim(),
      ] as const,
      queryFn: ({ signal }) =>
        searchOwnerCandidates(deviceId, search.trim(), signal),
      enabled: search.trim().length >= 2,
      staleTime: 30_000,
    }),
};
