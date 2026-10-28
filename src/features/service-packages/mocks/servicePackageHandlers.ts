import { HttpResponse, http, type JsonBodyType } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { packageStore } from '@/mocks/stores/servicePackageStore';
import { withIdempotency } from '@/mocks/stores/operationStore';
import { randomId } from '@/shared/lib/id';

import {
  packageStatusMutationSchema,
  servicePackageDraftInputSchema,
  type PackageStatus,
  type ServicePackageDto,
} from '../schemas/servicePackageSchemas';

// In-memory mock backend for the add-on service packages (M11). Resets on
// reload. Authorization, the publish/archive transition rules and the
// immutable audit trail live here, mirroring the device/campaign handlers.
// `packageStore` itself lives in src/mocks/stores/servicePackageStore.ts so
// other mock handlers (device service entitlements) can share it.
const roleKey = 'cms-portal:mock-auth-role'; // shared with handlers.ts
const userKey = 'cms-portal:mock-auth-user'; // shared with systemHandlers.ts

// Append-only audit log. Entries are never edited or deleted from the UI.
interface PackageAuditEntry {
  id: string;
  actor: string;
  package_id: string;
  field: string;
  before_value: string;
  after_value: string;
  reason: string;
  changed_at: string;
}
const packageAuditStore: PackageAuditEntry[] = [];

// Forward-only lifecycle: a draft can be published or archived, an active
// package can be archived. Anything else (e.g. reviving an archived package)
// is rejected.
const ALLOWED_TRANSITIONS: Record<PackageStatus, readonly PackageStatus[]> = {
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: [],
};

function allowed(capability: Capability): boolean {
  const role = localStorage.getItem(roleKey);
  return isPortalRole(role) && hasCapability(role, capability);
}

function actor(): string {
  const id = localStorage.getItem(userKey) ?? 'anonymous';
  const role = localStorage.getItem(roleKey);
  return role && isPortalRole(role) ? `${id} (${role})` : id;
}

function error(key: string, status: number) {
  return HttpResponse.json(
    { code: key, message: i18n.t('servicePackages:errors.' + key) },
    { status }
  );
}

// The wire-level conflict code is spec'd verbatim (§11: "trả idempotency_conflict"),
// independent of this file's own camelCase i18n-key convention.
function idempotencyConflict() {
  return HttpResponse.json(
    {
      code: 'idempotency_conflict',
      message: i18n.t('servicePackages:errors.idempotencyConflict'),
    },
    { status: 409 }
  );
}

// `withIdempotency`'s `run()` callback must return plain, re-serializable
// data — never an `HttpResponse`/`Response` instance. A `Response` body can
// only be read once; caching one and replaying it a second time throws
// ("Response body is already used"). So every idempotency-protected handler
// below builds one of these as its `run()` result, and only the outer
// `toResponse()` call (outside `withIdempotency`, run on every request,
// 'ran' or 'replayed' alike) turns it into an actual `HttpResponse`.
type HandlerOutcome =
  | { ok: true; data: JsonBodyType; status?: number }
  | { ok: false; code: string; status: number };

function toResponse(outcome: HandlerOutcome) {
  return outcome.ok
    ? HttpResponse.json(outcome.data, { status: outcome.status ?? 200 })
    : error(outcome.code, outcome.status);
}

function hasServerError(url: URL): boolean {
  return url.searchParams.get('mock_error') === '500';
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const servicePackageHandlers = [
  // Registered before the list GET so the exact /stats path wins.
  http.get('/api/service-packages/stats', ({ request }) => {
    if (!allowed('service_package.read')) return error('forbidden', 403);
    if (hasServerError(new URL(request.url))) return error('server', 500);
    return HttpResponse.json({
      total: packageStore.length,
      active: packageStore.filter((item) => item.status === 'active').length,
      recurring: packageStore.filter(
        (item) =>
          item.billing_type === 'recurring' ||
          item.billing_type === 'subscription'
      ).length,
    });
  }),
  http.get('/api/service-packages', ({ request }) => {
    if (!allowed('service_package.read')) return error('forbidden', 403);
    const url = new URL(request.url);
    if (hasServerError(url)) return error('server', 500);

    const search = url.searchParams.get('search')?.trim().toLocaleLowerCase();
    const group = url.searchParams.get('group');
    const billingType = url.searchParams.get('billing_type');
    const status = url.searchParams.get('status');
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePositiveInteger(
      url.searchParams.get('page_size'),
      10
    );

    const filtered = packageStore.filter(
      (item) =>
        (!search ||
          item.code.toLocaleLowerCase().includes(search) ||
          item.name.toLocaleLowerCase().includes(search)) &&
        (!group || item.group === group) &&
        (!billingType || item.billing_type === billingType) &&
        (!status || item.status === status)
    );
    const start = (page - 1) * pageSize;

    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: filtered.length,
    });
  }),
  // Idempotency-protected (plan "Phạm vi cập nhật 28/10/2026": every new
  // write endpoint, explicitly naming "tạo gói có cấu hình tự gắn"). The
  // permission check runs first; everything else — body validation, the
  // duplicate-code/eligible-model/TG-ALL checks, the actual mutation and the
  // audit entry — runs inside `withIdempotency`'s callback, so a replay (same
  // actor + route + Idempotency-Key + payload) returns the exact same
  // response without re-validating or double-writing.
  http.post('/api/service-packages', async ({ request }) => {
    if (!allowed('service_package.write')) return error('forbidden', 403);
    if (hasServerError(new URL(request.url))) return error('server', 500);

    const requestBody = await request.json().catch(() => null);
    const idempotencyKey = request.headers.get('Idempotency-Key') ?? undefined;

    const outcome = withIdempotency(
      actor(),
      'service-packages.create',
      idempotencyKey,
      requestBody,
      (): HandlerOutcome => {
        const parsed = servicePackageDraftInputSchema.safeParse(requestBody);
        if (!parsed.success)
          return { ok: false, code: 'invalidInput', status: 400 };
        const input = parsed.data;

        const code = input.code.toLocaleUpperCase();
        if (packageStore.some((item) => item.code.toLocaleUpperCase() === code))
          return { ok: false, code: 'duplicateCode', status: 409 };

        if (
          (input.configuration.type === 'TG-ALL' ||
            input.configuration.type === 'TG-SUB') &&
          input.configuration.packages.some((part) => {
            const target = packageStore.find((item) => item.id === part.id);
            return (
              !target ||
              target.status !== 'active' ||
              target.group === 'bundle' ||
              !servicePackageDraftInputSchema.safeParse(target).success
            );
          })
        )
          return { ok: false, code: 'invalidInput', status: 400 };

        const now = new Date().toISOString();
        const created: ServicePackageDto = {
          ...input,
          id: `pkg-${randomId().slice(0, 8)}`,
          code,
          name: input.name,
          group: input.group,
          billing_type: input.billing_type,
          status: 'draft',
          price: input.price,
          billing_period_months: input.billing_period_months,
          term_months: input.term_months,
          quota_mode: input.quota_mode,
          custom_quota: input.custom_quota,
          auto_attach: false,
          auto_attach_from: null,
          eligible_model_count: 0,
          description: input.description,
          updated_at: now,
        };
        packageStore.unshift(created);
        packageAuditStore.unshift({
          id: randomId(),
          actor: actor(),
          package_id: created.id,
          field: 'created',
          before_value: '',
          after_value: JSON.stringify(input),
          reason: '',
          changed_at: now,
        });

        return { ok: true, data: created, status: 201 };
      }
    );

    if (outcome.status === 'conflict') return idempotencyConflict();
    return toResponse(outcome.result);
  }),
  http.post(
    '/api/service-packages/:packageId/status',
    async ({ params, request }) => {
      if (!allowed('service_package.write')) return error('forbidden', 403);
      if (hasServerError(new URL(request.url))) return error('server', 500);

      const parsed = packageStatusMutationSchema.safeParse(
        await request.json().catch(() => null)
      );
      if (!parsed.success) return error('invalidInput', 400);

      const index = packageStore.findIndex(
        (item) => item.id === params.packageId
      );
      const current = packageStore[index];
      if (!current) return error('notFound', 404);

      const { status, reason } = parsed.data;
      if (status === current.status) return error('noChange', 400);
      if (!ALLOWED_TRANSITIONS[current.status].includes(status))
        return error('invalidTransition', 409);

      if (
        status === 'active' &&
        !servicePackageDraftInputSchema.safeParse(current).success
      )
        return error('configurationRequired', 400);
      if (
        status === 'active' &&
        (current.configuration?.type === 'TG-ALL' ||
          current.configuration?.type === 'TG-SUB') &&
        current.configuration.packages.some((part) => {
          const target = packageStore.find((item) => item.id === part.id);
          return (
            !target ||
            target.id === current.id ||
            target.status !== 'active' ||
            target.group === 'bundle' ||
            !servicePackageDraftInputSchema.safeParse(target).success
          );
        })
      )
        return error('invalidInput', 400);
      const before = current.status;
      const updated: ServicePackageDto = {
        ...current,
        status,
        updated_at: new Date().toISOString(),
      };
      packageStore[index] = updated;
      packageAuditStore.unshift({
        id: randomId(),
        actor: actor(),
        package_id: current.id,
        field: 'status',
        before_value: before,
        after_value: status,
        reason,
        changed_at: updated.updated_at,
      });

      return HttpResponse.json(updated);
    }
  ),
  http.post('/api/service-packages/:packageId/auto-attach', () => {
    if (!allowed('service_package.write')) return error('forbidden', 403);
    return error('autoAttachRetired', 410);
  }),
];
