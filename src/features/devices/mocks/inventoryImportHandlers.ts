import { HttpResponse, http } from 'msw';
import { isPortalRole } from '@/core/auth/types';
import { hasCapability } from '@/core/permissions/capabilities';
import i18n from '@/core/i18n';
import {
  InventoryImportError,
  confirmInventoryBatch,
  inventoryImportPackageOptions,
  previewInventoryBatch,
} from '@/mocks/stores/inventoryImportStore';
import { withIdempotency } from '@/mocks/stores/operationStore';
import { listMembersWithCapability } from '@/features/system/mocks/systemHandlers';
import { inventoryImportSourceSchema } from '../schemas/inventoryImportSchemas';

function allowed(write = false) {
  if (write && localStorage.getItem('cms-portal:mock-auth-simulated'))
    return false;
  const role = localStorage.getItem('cms-portal:mock-auth-role');
  return isPortalRole(role) && hasCapability(role, 'device.inventory.sync');
}
function actor() {
  const id = localStorage.getItem('cms-portal:mock-auth-user') ?? 'anonymous';
  return {
    id,
    fullName:
      listMembersWithCapability('device.inventory.sync').find(
        (member) => member.id === id
      )?.name ?? id,
  };
}
function error(code: string, status = 400) {
  return HttpResponse.json(
    {
      code,
      message: i18n.t(`devices:inventory.import.errors.${code}`, {
        defaultValue: i18n.t('devices:inventory.import.errors.unknown'),
      }),
    },
    { status }
  );
}
export const inventoryImportHandlers = [
  http.get('/api/devices/inventory/import/package-options', () => {
    if (!allowed()) return error('forbidden', 403);
    return HttpResponse.json(inventoryImportPackageOptions());
  }),
  http.post('/api/devices/inventory/import/preview', async ({ request }) => {
    if (!allowed()) return error('forbidden', 403);
    const parsed = inventoryImportSourceSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) return error('invalid_input');
    try {
      return HttpResponse.json(previewInventoryBatch(actor().id, parsed.data));
    } catch (cause) {
      if (cause instanceof InventoryImportError) return error(cause.code);
      throw cause;
    }
  }),
  http.post('/api/devices/inventory/import/confirm', async ({ request }) => {
    if (!allowed(true)) return error('forbidden', 403);
    const key = request.headers.get('Idempotency-Key');
    if (!key) return error('invalid_input');
    const input = await request.json().catch(() => null);
    const result = withIdempotency(
      actor().id,
      'inventory.import.confirm',
      key,
      input,
      () => {
        try {
          return {
            ok: true as const,
            data: confirmInventoryBatch(actor(), input),
          };
        } catch (cause) {
          if (cause instanceof InventoryImportError)
            return { ok: false as const, code: cause.code };
          throw cause;
        }
      }
    );
    if (result.status === 'conflict') return error('idempotency_conflict', 409);
    return result.result.ok
      ? HttpResponse.json(result.result.data)
      : error(result.result.code, 409);
  }),
];
