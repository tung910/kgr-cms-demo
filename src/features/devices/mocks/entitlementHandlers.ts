import { HttpResponse, http } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import {
  entitlementEvents,
  entitlementRecords,
  toEntitlementDto,
} from '@/mocks/stores/entitlementStore';
import type { EntitlementEventDto } from '@/features/devices/schemas/entitlementSchemas';

// Mock backend for device service entitlements (spec §11). Read-only in this
// phase (Task 4) — no write endpoints yet (reservation/usage mutations ship
// with the phiếu/KTV + adjustment tasks). Registered before the generic
// `/api/devices/:deviceId` handler in src/mocks/handlers.ts, same convention
// as deviceExtraHandlers.ts.

const roleKey = 'cms-portal:mock-auth-role'; // shared with handlers.ts

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}

function forbidden() {
  return HttpResponse.json(
    { message: i18n.t('devices:errors.forbidden') },
    { status: 403 }
  );
}

function pageOf(url: URL, items: readonly EntitlementEventDto[]) {
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

export const entitlementHandlers = [
  http.get('/api/devices/:deviceId/entitlements', ({ params }) => {
    if (!allowed('device.read')) return forbidden();
    const deviceId = String(params.deviceId);
    const now = new Date();
    const entitlements = entitlementRecords
      .filter((record) => record.device_id === deviceId)
      .map((record) => toEntitlementDto(record, now));
    return HttpResponse.json(entitlements);
  }),
  // Newest first (§8.2 "lịch sử sử dụng (mới nhất trước)").
  http.get('/api/entitlements/:id/events', ({ params, request }) => {
    if (!allowed('device.read')) return forbidden();
    const entitlementId = String(params.id);
    const events = entitlementEvents
      .filter((event) => event.entitlement_id === entitlementId)
      .slice()
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    return HttpResponse.json(pageOf(new URL(request.url), events));
  }),
];
