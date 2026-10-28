import { HttpResponse, delay, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { inventoryStore, receiveNewUnits } from '@/mocks/stores/inventoryStore';
import { entitlementSummaries } from '@/mocks/stores/entitlementStore';

import { AGED_STOCK_DAYS, AGING_WARNING_DAYS } from '../constants/inventory';
import type { InventoryDeviceDto } from '../schemas/inventorySchemas';

// Mock backend for the device list's unused stock ("Tồn kho") tab.
// Registered before the main device handlers so these paths win over
// /api/devices/:deviceId. `inventoryStore` and the "Đồng bộ" unit generator
// live in src/mocks/stores/inventoryStore.ts so other mock handlers (device
// service entitlements auto-attach, Task 7) can share them.

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
    inventoryStore
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
  http.post('/api/devices/inventory/sync', async () => {
    if (!allowed('device.inventory.sync')) return error('forbidden', 403);
    await delay(800);
    const received = receiveNewUnits();
    return HttpResponse.json({
      synced_at: new Date().toISOString(),
      added: received.length,
      updated: 0,
    });
  }),
  http.get('/api/devices/inventory', ({ request }) => {
    if (!allowed('device.read')) return error('forbidden', 403);
    const url = new URL(request.url);
    const page = pageOf(url, filterInventory(url));
    const now = new Date();
    return HttpResponse.json({
      ...page,
      items: page.items.map((device) => ({
        ...device,
        entitlements_summary: entitlementSummaries(device.device_id, now),
      })),
    });
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
