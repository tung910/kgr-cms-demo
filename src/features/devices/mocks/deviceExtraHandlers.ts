import { HttpResponse, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { inventoryDeviceFixtures } from '@/mocks/fixtures/inventoryDevices';

import { AGED_STOCK_DAYS, AGING_WARNING_DAYS } from '../constants/inventory';
import type { InventoryDeviceDto } from '../schemas/inventorySchemas';

// Mock backend for the device list's unused stock ("Tồn kho") tab.
// Registered before the main device handlers so these paths win over
// /api/devices/:deviceId.

const roleKey = 'cms-portal:mock-auth-role'; // shared with handlers.ts
const dayMs = 86_400_000;

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}

function error(key: string, status: number) {
  return HttpResponse.json(
    { message: i18n.t('devices:errors.' + key) },
    { status }
  );
}

function pageOf<T>(url: URL, items: readonly T[]) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Number(url.searchParams.get('page_size')) || 10);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total: items.length,
  };
}

function filterInventory(url: URL): InventoryDeviceDto[] {
  const search = url.searchParams.get('search')?.trim().toLocaleLowerCase();
  const model = url.searchParams.get('model')?.trim();
  return (
    inventoryDeviceFixtures
      .filter(
        (device) =>
          (!search || device.device_id.toLocaleLowerCase().includes(search)) &&
          (!model || device.model_name === model)
      )
      // Oldest stock first so FIFO candidates surface on page 1.
      .sort((a, b) => a.received_at.localeCompare(b.received_at))
  );
}

export const deviceExtraHandlers = [
  http.get('/api/devices/inventory', ({ request }) => {
    if (!allowed('device.read')) return error('forbidden', 403);
    const url = new URL(request.url);
    return HttpResponse.json(pageOf(url, filterInventory(url)));
  }),
  http.get('/api/devices/inventory/counts', ({ request }) => {
    if (!allowed('device.read')) return error('forbidden', 403);
    const devices = filterInventory(new URL(request.url));
    const ageOf = (device: InventoryDeviceDto) =>
      (Date.now() - Date.parse(device.received_at)) / dayMs;
    return HttpResponse.json({
      total: devices.length,
      iot: devices.filter((device) => device.connectivity === 'iot').length,
      non_iot: devices.filter((device) => device.connectivity === 'non_iot')
        .length,
      aging: devices.filter((device) => {
        const age = ageOf(device);
        return age > AGING_WARNING_DAYS && age <= AGED_STOCK_DAYS;
      }).length,
      aged: devices.filter((device) => ageOf(device) > AGED_STOCK_DAYS).length,
    });
  }),
];
