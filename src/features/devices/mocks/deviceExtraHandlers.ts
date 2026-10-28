import { HttpResponse, delay, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { recordAudit } from '@/features/system/mocks/systemHandlers';
import { inventoryStore, receiveNewUnits } from '@/mocks/stores/inventoryStore';
import {
  attachPackage,
  entitlementSummaries,
} from '@/mocks/stores/entitlementStore';
import { packageStore } from '@/mocks/stores/servicePackageStore';

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

// §4.2/§4.3: for each *newly added* unit from a sync (never for merely
// updated ones), auto-attach every package that is active, has auto-attach
// on, whose effective date is on or before the sync's calendar date, and
// whose model scope covers the device. `attachPackage` already enforces the
// model-scope and no-duplicate rules, so filtering here only needs the
// package-level conditions; calling it unconditionally for every (device,
// eligible package) pair is safe to re-run — a brand-new device cannot
// already hold the package, and a later sync never revisits this device
// again since `receiveNewUnits()` only returns units added by this call.
function attachAutoEntitlementsOnSync(
  devices: readonly InventoryDeviceDto[],
  syncedAt: string
): number {
  const syncedDate = syncedAt.slice(0, 10); // calendar date, not datetime
  const eligiblePackages = packageStore.filter(
    (pkg) =>
      pkg.status === 'active' &&
      pkg.auto_attach === true &&
      typeof pkg.auto_attach_from === 'string' &&
      pkg.auto_attach_from <= syncedDate
  );
  if (eligiblePackages.length === 0) return 0;

  let attachedCount = 0;
  const deviceIds = new Set<string>();
  const packageIds = new Set<string>();
  for (const device of devices) {
    for (const pkg of eligiblePackages) {
      const record = attachPackage(
        {
          deviceId: device.device_id,
          modelCode: device.model_name,
          activatedAt: null,
        },
        pkg,
        {
          kind: 'auto_attach',
          reference: `Đồng bộ kho ${syncedAt}`,
          at: syncedAt,
        }
      );
      if (record) {
        attachedCount += 1;
        deviceIds.add(device.device_id);
        packageIds.add(pkg.id);
      }
    }
  }

  if (attachedCount > 0) {
    recordAudit(null, {
      module: 'service_entitlements',
      action: 'auto_attach_on_sync',
      target: 'inventory_sync',
      after: {
        synced_at: syncedAt,
        entitlements_attached: attachedCount,
        device_ids: Array.from(deviceIds),
        package_ids: Array.from(packageIds),
      },
      actorName: 'system',
    });
  }

  return attachedCount;
}

export const deviceExtraHandlers = [
  http.post('/api/devices/inventory/sync', async () => {
    if (!allowed('device.inventory.sync')) return error('forbidden', 403);
    await delay(800);
    const syncedAt = new Date().toISOString();
    const received = receiveNewUnits();
    const entitlementsAttached = attachAutoEntitlementsOnSync(
      received,
      syncedAt
    );
    return HttpResponse.json({
      synced_at: syncedAt,
      added: received.length,
      updated: 0,
      entitlements_attached: entitlementsAttached,
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
