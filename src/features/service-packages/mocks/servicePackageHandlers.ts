import { HttpResponse, http, type JsonBodyType } from 'msw';

import i18n from '@/core/i18n';
import { isPortalRole } from '@/core/auth/types';
import {
  hasCapability,
  type Capability,
} from '@/core/permissions/capabilities';
import { recordAudit } from '@/features/system/mocks/systemHandlers';
import { modelFixtures } from '@/mocks/fixtures/models';
import { packageStore } from '@/mocks/stores/servicePackageStore';
import { withIdempotency } from '@/mocks/stores/operationStore';
import { businessDateOf } from '@/shared/lib/businessDate';
import { randomId } from '@/shared/lib/id';

import { mapServicePackage } from '../api/servicePackageMapper';
import {
  packageAutoAttachMutationSchema,
  packageStatusMutationSchema,
  servicePackageDraftInputSchema,
  type PackageStatus,
  type ServicePackageDto,
} from '../schemas/servicePackageSchemas';
import { getAutoAttachBlockers } from '../utils/entitlementRules';

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

// Shape `recordAudit` (src/features/system/mocks/systemHandlers.ts) expects —
// the module-level audit trail wants an id + a display name, not the
// `"id (role)"` string `actor()` above produces for `packageAuditStore`.
function auditActor(): { id: string; fullName: string } {
  const id = localStorage.getItem(userKey) ?? 'anonymous';
  const role = localStorage.getItem(roleKey);
  const fullName =
    role && isPortalRole(role)
      ? i18n.t(`roles.${role}`, { ns: 'common' })
      : '—';
  return { id, fullName };
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
          input.eligible_model_ids.some(
            (id) => !modelFixtures.some((model) => model.model_id === id)
          )
        )
          return { ok: false, code: 'invalidInput', status: 400 };
        if (
          input.configuration.type === 'TG-ALL' &&
          input.configuration.packages.some((part) => {
            const target = packageStore.find((item) => item.id === part.id);
            return (
              !target || target.status !== 'active' || target.group === 'bundle'
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
          auto_attach: input.auto_attach,
          auto_attach_from: input.auto_attach_from,
          eligible_model_count:
            input.model_scope === 'all'
              ? modelFixtures.length
              : input.eligible_model_ids.length,
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
        current.configuration?.type === 'TG-ALL' &&
        current.configuration.packages.some((part) => {
          const target = packageStore.find((item) => item.id === part.id);
          return (
            !target ||
            target.id === current.id ||
            target.status !== 'active' ||
            target.group === 'bundle'
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
  // Toggle "auto-attach khi nhập kho" (spec §4.1). Also idempotency-protected
  // per the plan's 28/10/2026 scope note ("bật/tắt tự gắn"). Permission and
  // the archived/not-found checks run first (so a replay by an
  // actor who lost permission, or against a package since archived, is
  // rejected rather than served a cached success); everything else —
  // request-shape validation, the blocker/past-date/no-change business
  // rules, the mutation and both audit writes — runs inside the
  // `withIdempotency` callback.
  http.post(
    '/api/service-packages/:packageId/auto-attach',
    async ({ params, request }) => {
      if (!allowed('service_package.write')) return error('forbidden', 403);
      if (hasServerError(new URL(request.url))) return error('server', 500);

      const index = packageStore.findIndex(
        (item) => item.id === params.packageId
      );
      const current = packageStore[index];
      if (!current) return error('notFound', 404);
      if (current.status === 'archived') return error('invalidTransition', 409);

      const requestBody = await request.json().catch(() => null);
      const idempotencyKey =
        request.headers.get('Idempotency-Key') ?? undefined;

      const outcome = withIdempotency(
        actor(),
        'service-packages.auto-attach',
        idempotencyKey,
        requestBody,
        (): HandlerOutcome => {
          const parsed = packageAutoAttachMutationSchema.safeParse(requestBody);
          if (!parsed.success)
            return { ok: false, code: 'invalidInput', status: 400 };
          const { enabled, from, reason } = parsed.data;

          const domain = mapServicePackage(current);

          if (enabled) {
            const blockers = getAutoAttachBlockers({
              group: domain.group,
              termMonths: domain.termMonths,
              quotaMode: domain.quotaMode,
              customQuota: domain.customQuota,
              details: domain.details
                ? {
                    pricingMode: domain.details.pricingMode,
                    configuration: domain.details.configuration,
                  }
                : null,
            });
            if (blockers.length > 0)
              return { ok: false, code: 'autoAttachBlocked', status: 400 };

            // Asia/Ho_Chi_Minh business date (spec §15.5/§16), matching the
            // inventory-sync handler's `syncedDate` and the client's
            // dayjs()-based date pickers — not a naive UTC slice.
            const today = businessDateOf(new Date());
            if (from === null || from < today)
              return { ok: false, code: 'autoAttachFromPast', status: 400 };
          }

          const unchanged =
            enabled === domain.autoAttach &&
            (!enabled || from === domain.autoAttachFrom);
          if (unchanged) return { ok: false, code: 'noChange', status: 400 };

          const before = {
            auto_attach: domain.autoAttach,
            auto_attach_from: domain.autoAttachFrom,
          };
          const now = new Date().toISOString();
          const updated: ServicePackageDto = {
            ...current,
            auto_attach: enabled,
            auto_attach_from: enabled ? from : null,
            updated_at: now,
          };
          packageStore[index] = updated;
          const after = {
            auto_attach: updated.auto_attach,
            auto_attach_from: updated.auto_attach_from,
          };
          packageAuditStore.unshift({
            id: randomId(),
            actor: actor(),
            package_id: current.id,
            field: 'auto_attach',
            before_value: JSON.stringify(before),
            after_value: JSON.stringify(after),
            reason,
            changed_at: now,
          });
          recordAudit(auditActor(), {
            module: 'service_entitlements',
            action: enabled ? 'auto_attach_enabled' : 'auto_attach_disabled',
            target: current.id,
            before,
            after,
            reason,
          });

          return { ok: true, data: updated };
        }
      );

      if (outcome.status === 'conflict') return idempotencyConflict();
      return toResponse(outcome.result);
    }
  ),
];
