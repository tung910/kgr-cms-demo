# Device Detail (CMS_QnA_V1 §3.4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the existing device detail screen (`/devices/$deviceId`) in line with `docs/CMS_QnA_V1_SPEC.md` §3.4 / 3.4b / 3.4c / 3.4d.

**Architecture:** The `devices` feature slice already exists. PII is stripped at the response layer (MSW `deviceForRole`, backend later) and the UI hides blocks by capability. New owner mutations and the connectivity history are device-scoped sub-resources in `api/deviceDetailApi.ts`, parsed with Zod and mapped to camelCase models. Each task follows the `SCREEN_WORKFLOW.md` order: permissions → schema → API → query → mock → i18n → components.

**Tech Stack:** Vite, React 19, TypeScript, TanStack Router/Query, Zod, Ant Design, ECharts (`PortalEChart`), MSW, i18next.

**Spec:** `docs/superpowers/specs/2026-09-22-device-detail-design.md` (read it with this plan).

## Global Constraints

- Follow `AGENTS.md`, `docs/CODING_CONVENTIONS.md`, `docs/SCREEN_WORKFLOW.md`.
- Two-space indent, single quotes, semicolons; Prettier + ESLint enforce.
- Capability checks only via `hasCapability` / `PermissionGuard`; never branch on role names. Missing capability → element hidden, not disabled.
- DTO = snake_case parsed with Zod at the API boundary; model = camelCase.
- Every user-visible string goes through i18n in both `src/features/devices/locales/vi.json` and `en.json`.
- Every state-changing call carries a required, trimmed, non-empty `reason`; the server writes the audit entry (actor, time, before/after, reason).
- No new dependencies. CSV export uses `downloadCsv` from `src/shared/lib/csv.ts`.
- **No test framework is configured and none may be added** (AGENTS.md). Each task's check is `pnpm typecheck` + `pnpm lint` + a manual MSW check. Task 6 runs the full required set.
- Run `pnpm` from **PowerShell** — `node` is not on the Git Bash PATH on this machine.
- Do not edit `src/routeTree.gen.ts`.
- Mock role: MSW reads it from `localStorage['cms-portal:mock-auth-role']`, set by the login screen in mock mode. Role ids: `super_admin`, `admin`, `factory`, `service_center`, `sales`, `logistics`.
- Commit messages: Conventional Commits, no `Co-Authored-By` trailer.

---

### Task 1: Hide owner, shared list and history by role

**Files:**

- Modify: `src/features/devices/schemas/deviceSchemas.ts` (`deviceDtoSchema`)
- Modify: `src/features/devices/api/deviceMapper.ts`
- Modify: `src/mocks/handlers.ts` (`deviceForRole`, `mutateDevice` delete branch, `/owner`, `/alerts`, `/filter-changes`, `/ota-history`, `/service-history`)
- Modify: `src/features/devices/components/DeviceOverview.tsx`
- Modify: `src/features/devices/components/DeviceHistoryPanel.tsx`
- Delete: `src/features/devices/components/DeviceAlertHistoryPanel.tsx`
- Modify: `src/features/devices/pages/DeviceDetailPage.tsx`
- Modify: `src/features/devices/locales/vi.json`, `en.json` (`history.tabs.alerts`)

**Interfaces:**

- Produces: `DeviceOverviewProps.showOwner: boolean` (Task 5 adds `showControlState`); `DeviceDto.shared_members` / `owner_history` become optional — every server-side reader must use `?? []`.

- [x] **Step 1: Make the PII arrays optional in the DTO**

In `deviceSchemas.ts`, inside `deviceDtoSchema`, replace:

```ts
  shared_members: z.array(deviceSharedMemberDtoSchema),
  owner_history: z.array(deviceOwnerHistoryEntryDtoSchema),
```

with:

```ts
  // Omitted for roles without device.pii.full (§3.4: owner block hidden).
  shared_members: z.array(deviceSharedMemberDtoSchema).optional(),
  owner_history: z.array(deviceOwnerHistoryEntryDtoSchema).optional(),
```

- [x] **Step 2: Default them in the mapper**

In `deviceMapper.ts` replace `dto.shared_members.map(` with `(dto.shared_members ?? []).map(` and `dto.owner_history.map(` with `(dto.owner_history ?? []).map(`.

- [x] **Step 3: Strip PII in `deviceForRole`**

In `src/mocks/handlers.ts`, replace the whole `deviceForRole` function with:

```ts
// Audit entries whose before/after values carry owner or member PII.
const OWNER_AUDIT_ACTIONS = new Set([
  'change_owner',
  'remove_owner',
  'revoke_sharing',
  'delete',
  'restore',
]);

// §2.3/§3.4: masking happens here, at the response layer, so the API and any
// export built from it always agree with what the UI shows. `owner` keeps its
// id because the §3.2 list shows the customer ID to every role.
function deviceForRole(
  device: DeviceDto,
  role: PortalRole | undefined
): DeviceDto {
  if (role && hasCapability(role, 'device.pii.full')) return device;
  return {
    ...device,
    install_address: maskInstallAddress(device.install_address),
    ...(device.owner && { owner: { id: device.owner.id } }),
    shared_members: undefined,
    owner_history: undefined,
    operation_log: device.operation_log.map((entry) =>
      OWNER_AUDIT_ACTIONS.has(entry.action)
        ? { ...entry, before_value: undefined, after_value: undefined }
        : entry
    ),
  };
}
```

- [x] **Step 4: Fix the one server-side reader**

In `mutateDevice`, `action === 'delete'` branch, replace:

```ts
      owner_history: current.owner_history.map((entry) =>
```

with:

```ts
      owner_history: (current.owner_history ?? []).map((entry) =>
```

- [x] **Step 5: Gate the owner profile and history endpoints**

In `handlers.ts`:

- `http.get('/api/devices/:deviceId/owner', …)`: change `if (!allowed('device.read'))` to `if (!allowed('device.pii.full'))`, and replace the comment above it with `// Device-scoped owner profile — §3.4 hides the owner block from roles without device.pii.full.`
- `/alerts`, `/filter-changes`, `/ota-history`, `/service-history`: change `if (!allowed('device.read'))` to `if (!allowed('device.history.read'))` (3.4d).

Leave `/core-alerts` on `device.read` — it is part of the filter-core block every role sees.

- [x] **Step 6: Add `showOwner` to `DeviceOverview`**

In `DeviceOverview.tsx`, add to `DeviceOverviewProps`:

```ts
  /** §3.4: owner name/phone only for roles holding device.pii.full. */
  showOwner: boolean;
```

Destructure `showOwner` in the component signature and replace the `ownerLine` array with:

```tsx
  const ownerLine = [
    !showOwner ? null : device.owner ? (
      <button
        key="owner"
        type="button"
        onClick={onOwnerClick}
        className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[#F16522] hover:underline"
      >
        <UserOutlined /> {device.owner.name ?? device.owner.id}
      </button>
    ) : (
      <span key="owner">
        <UserOutlined /> {t('detailPage.noOwner')}
      </span>
    ),
    device.region ? <span key="region">{device.region}</span> : null,
    showOwner && device.owner?.phoneMasked ? (
      <span key="phone" className="font-mono">
        {device.owner.phoneMasked}
      </span>
    ) : null,
  ].filter(Boolean);
```

- [x] **Step 7: Move alert history into the history tabs**

In `DeviceHistoryPanel.tsx`:

1. Add imports:

```ts
import { WarningOutlined } from '@ant-design/icons';
import type { PortalTone } from '@/shared/components/portal';
import { referenceColors, softTones } from '@/theme/tokens';
```

and add `AlertHistoryEntry` to the `../schemas/deviceDetailSchemas` type import.

2. Above the component add:

```ts
const severityTone: Record<AlertHistoryEntry['severity'], PortalTone> = {
  P1: 'danger',
  P2: 'warning',
  P3: 'info',
  P4: 'warning',
};
```

3. In the component add `const alerts = useQuery(deviceQueries.alertHistory(device.id));` next to the other queries.

4. Append this item to the `Tabs` `items` array (after `service`):

```tsx
          {
            key: 'alerts',
            label: t('history.tabs.alerts'),
            children: !alerts.data?.length ? (
              <Empty text={t('history.alertsEmpty')} />
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {alerts.data.map((entry: AlertHistoryEntry) => {
                  const tone = severityTone[entry.severity];
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-[#E7E8E9] p-3"
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: softTones[tone],
                          color: referenceColors[tone],
                        }}
                      >
                        <WarningOutlined />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-[#020204]">
                          {entry.title}
                        </p>
                        <p className="m-0 mt-0.5 font-mono text-xs text-[#636466]">
                          {entry.severity}-{entry.code} ·{' '}
                          {formatDateTime(
                            entry.occurredAt,
                            i18n.resolvedLanguage
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[#636466]">
                        {t('history.alertStatus.' + entry.status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ),
          },
```

5. Update the comment above the component to: `// §3.4d — device history, one request per tab so a slow or failing history never blocks the others. Gated by device.history.read in DeviceDetailPage.`

Then delete `src/features/devices/components/DeviceAlertHistoryPanel.tsx`.

- [x] **Step 8: i18n**

In `history.tabs` add `"alerts": "Cảnh báo"` (vi) and `"alerts": "Alerts"` (en). Remove the now-unused `history.alertsTitle` key from both files.

- [x] **Step 9: Rewrite `DeviceDetailPage`**

Replace the whole file with:

```tsx
import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

import { DeviceCoreAlertsPanel } from '../components/DeviceCoreAlertsPanel';
import { DeviceDeleteDialog } from '../components/DeviceDeleteDialog';
import { DeviceFilterCoresPanel } from '../components/DeviceFilterCoresPanel';
import { DeviceHistoryPanel } from '../components/DeviceHistoryPanel';
import { DeviceLifecycleActions } from '../components/DeviceLifecycleActions';
import { DeviceOperationLogPanel } from '../components/DeviceOperationLogPanel';
import { DeviceOverview } from '../components/DeviceOverview';
import { DeviceOwnerDrawer } from '../components/DeviceOwnerDrawer';
import { DeviceOwnershipPanel } from '../components/DeviceOwnershipPanel';
import { DeviceRemoteActions } from '../components/DeviceRemoteActions';
import { DeviceRemoteDiagnosticPanel } from '../components/DeviceRemoteDiagnosticPanel';
import { DeviceTelemetryPanel } from '../components/DeviceTelemetryPanel';
import { deviceQueries } from '../queries/deviceQueries';

export interface DeviceDetailPageProps {
  deviceId: string;
}

export function DeviceDetailPage({ deviceId }: DeviceDetailPageProps) {
  const { t } = useTranslation('devices');
  const { session } = useAuth();
  const { data: device } = useSuspenseQuery(deviceQueries.detail(deviceId));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);
  const openOwnerDrawer = () => setOwnerDrawerOpen(true);
  // §3.4: factory, sales and logistics only see the technical block.
  const canSeeOwner = Boolean(
    session && hasCapability(session.role, 'device.pii.full')
  );
  const canSeeHistory = Boolean(
    session && hasCapability(session.role, 'device.history.read')
  );
  const neverOperated =
    !device.activatedAt &&
    !device.lastOnlineAt &&
    device.latestTelemetry.length === 0 &&
    device.status === 'offline';

  return (
    <div className="space-y-4">
      <DeviceOverview
        device={device}
        showOwner={canSeeOwner}
        onOwnerClick={openOwnerDrawer}
        actions={<DeviceRemoteActions device={device} placement="header" />}
        secondaryActions={
          <>
            <DeviceLifecycleActions device={device} />
            {neverOperated ? (
              <PermissionGuard capability="device.lifecycle">
                <Button size="small" danger onClick={() => setDeleteOpen(true)}>
                  {t('ownership.deleteRecord')}
                </Button>
              </PermissionGuard>
            ) : null}
          </>
        }
      />

      <DeviceCoreAlertsPanel device={device} />

      <DeviceTelemetryPanel device={device} />
      <DeviceFilterCoresPanel device={device} />

      <DeviceRemoteDiagnosticPanel device={device} />

      {canSeeHistory || canSeeOwner ? (
        <div
          className={
            canSeeHistory && canSeeOwner
              ? 'grid gap-4 xl:grid-cols-3'
              : 'grid gap-4'
          }
        >
          {canSeeHistory ? (
            <div className={canSeeOwner ? 'xl:col-span-2' : undefined}>
              <DeviceHistoryPanel device={device} />
            </div>
          ) : null}
          {canSeeOwner ? (
            <DeviceOwnershipPanel
              device={device}
              onOwnerClick={openOwnerDrawer}
            />
          ) : null}
        </div>
      ) : null}

      <DeviceOperationLogPanel device={device} />

      {canSeeOwner && device.owner ? (
        <DeviceOwnerDrawer
          deviceId={device.id}
          open={ownerDrawerOpen}
          onClose={() => setOwnerDrawerOpen(false)}
        />
      ) : null}

      <PermissionGuard capability="device.lifecycle">
        <DeviceDeleteDialog
          device={device}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
        />
      </PermissionGuard>
    </div>
  );
}
```

- [x] **Step 10: Check**

Run (PowerShell): `pnpm typecheck; if ($?) { pnpm lint }`
Expected: both exit 0. If `rg DeviceAlertHistoryPanel src` still finds a reference, remove it.

- [ ] **Step 11: Manual MSW check**

`pnpm dev`, open `/devices/KGR-0001` (it has a shared member) as each role:

- `admin`, `service_center`: owner line in header, ownership panel, history panel with 4 tabs (Thay lõi, OTA, Bảo hành & dịch vụ, Cảnh báo).
- `factory`: no owner line or ownership panel; history panel spans full width. DevTools → Network → `/api/devices/KGR-0001` response has no `shared_members` / `owner_history`, `owner` is `{ "id": "CUS-2001" }`.
- `sales`, `logistics`: neither panel. `/devices` list still shows the customer ID column value.

- [x] **Step 12: Commit**

```bash
git add -A src/features/devices src/mocks/handlers.ts
git commit -m "feat(devices): hide owner block and history by role on device detail"
```

---

### Task 2: Owner management API and mock

**Files:**

- Modify: `src/features/devices/schemas/deviceSchemas.ts`
- Modify: `src/features/devices/schemas/deviceDetailSchemas.ts`
- Modify: `src/features/devices/api/deviceMapper.ts`
- Modify: `src/features/devices/api/deviceDetailApi.ts`
- Modify: `src/features/devices/queries/deviceQueries.ts`
- Modify: `src/features/customers/mocks/customerMockData.ts` (add `address`)
- Modify: `src/mocks/fixtures/devices.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/features/devices/locales/vi.json`, `en.json` (`errors`, `operationLog`)

**Interfaces:**

- Consumes: `deviceForRole` from Task 1 (already strips the new fields for non-PII roles).
- Produces (used by Task 3):
  - `type SharePermission = 'control' | 'view'` and `DeviceSharedMember { id; name; phone?: string; address?: string; permission: SharePermission; sharedAt }` in `deviceSchemas.ts`
  - `DeviceOwner.address?: string`
  - `interface OwnerCandidate { id: string; name: string; phone: string; address?: string }` in `deviceDetailSchemas.ts`
  - `searchOwnerCandidates(deviceId: string, query: string, signal?: AbortSignal): Promise<OwnerCandidate[]>`
  - `changeDeviceOwner(deviceId: string, customerId: string, reason: string): Promise<{ previousOwnerNotified: boolean }>`
  - `removeDeviceOwner(deviceId: string, reason: string): Promise<{ previousOwnerNotified: boolean }>`
  - `revokeSharedMember(deviceId: string, memberId: string, reason: string): Promise<void>`
  - `deviceQueries.ownerCandidates(deviceId: string, search: string)` (disabled below 2 characters)

- [x] **Step 1: Extend the device schemas**

In `deviceSchemas.ts`:

Replace the `DeviceOwner` and `DeviceSharedMember` interfaces with:

```ts
export interface DeviceOwner {
  id: string;
  // Omitted for roles without device.pii.full (§3.2 note).
  name?: string;
  // Masked server-side per the viewer's role (NĐ 13/2023) — never unmasked here.
  phoneMasked?: string;
  address?: string;
}

export type SharePermission = z.infer<typeof sharePermissionSchema>;

export interface DeviceSharedMember {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  permission: SharePermission;
  sharedAt: string;
}
```

Replace `deviceOwnerDtoSchema` and `deviceSharedMemberDtoSchema` with:

```ts
export const deviceOwnerDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  phone_masked: z.string().optional(),
  address: z.string().optional(),
});
```

```ts
// ⚠️ Assumption: the app's share levels are "control" and "view"; confirm
// with OneKangaroo before the real API lands.
export const sharePermissionSchema = z.enum(['control', 'view']);

export const deviceSharedMemberDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  permission: sharePermissionSchema,
  shared_at: z.string().datetime({ offset: true }),
});
```

`sharePermissionSchema` must be declared above the `SharePermission` type alias's first use at runtime; type aliases are hoisted, so declaring the schema just before `deviceSharedMemberDtoSchema` is fine.

- [x] **Step 2: Map the new fields**

In `deviceMapper.ts`, owner block becomes:

```ts
    ...(dto.owner && {
      owner: {
        id: dto.owner.id,
        ...(dto.owner.name && { name: dto.owner.name }),
        ...(dto.owner.phone_masked && { phoneMasked: dto.owner.phone_masked }),
        ...(dto.owner.address && { address: dto.owner.address }),
      },
    }),
```

and shared members:

```ts
    sharedMembers: (dto.shared_members ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      ...(member.phone && { phone: member.phone }),
      ...(member.address && { address: member.address }),
      permission: member.permission,
      sharedAt: member.shared_at,
    })),
```

- [x] **Step 3: Candidate and result schemas**

Append to `deviceDetailSchemas.ts`:

```ts
// §3.4b owner change — customers the operator can transfer the device to.
// Device-scoped so the devices slice never imports from features/customers.
export const ownerCandidateDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
});
export type OwnerCandidateDto = z.infer<typeof ownerCandidateDtoSchema>;
export interface OwnerCandidate {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

// The backend notifies the previous owner in the app (3.4b note).
export const ownerMutationResultDtoSchema = z.object({
  previous_owner_notified: z.boolean(),
});
export type OwnerMutationResultDto = z.infer<
  typeof ownerMutationResultDtoSchema
>;
```

- [x] **Step 4: API functions**

In `deviceDetailApi.ts` add `ownerCandidateDtoSchema`, `ownerMutationResultDtoSchema` and `type OwnerCandidate` to the schema import, then append:

```ts
export async function searchOwnerCandidates(
  deviceId: string,
  query: string,
  signal?: AbortSignal
): Promise<OwnerCandidate[]> {
  const response = await apiClient.get<unknown>(
    devicePath(
      deviceId,
      `/owner-candidates?q=${encodeURIComponent(query.trim())}`
    ),
    { signal }
  );
  const parsed = ownerCandidateDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    name: item.name,
    phone: item.phone,
    ...(item.address && { address: item.address }),
  }));
}

function parseOwnerMutationResult(response: unknown): {
  previousOwnerNotified: boolean;
} {
  const parsed = ownerMutationResultDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return { previousOwnerNotified: parsed.data.previous_owner_notified };
}

// §3.4b: the server closes the ownership period, writes the audit entry
// (before/after) and notifies the previous owner.
export async function changeDeviceOwner(
  deviceId: string,
  customerId: string,
  reason: string
): Promise<{ previousOwnerNotified: boolean }> {
  return parseOwnerMutationResult(
    await apiClient.put<unknown>(devicePath(deviceId, '/owner'), {
      customer_id: customerId,
      reason,
    })
  );
}

// POST, not DELETE: the transport DELETE has no body and the reason is required.
export async function removeDeviceOwner(
  deviceId: string,
  reason: string
): Promise<{ previousOwnerNotified: boolean }> {
  return parseOwnerMutationResult(
    await apiClient.post<unknown>(devicePath(deviceId, '/owner/remove'), {
      reason,
    })
  );
}

export async function revokeSharedMember(
  deviceId: string,
  memberId: string,
  reason: string
): Promise<void> {
  await apiClient.post<unknown>(
    devicePath(
      deviceId,
      `/shared-members/${encodeURIComponent(memberId)}/revoke`
    ),
    { reason }
  );
}
```

- [x] **Step 5: Query factory**

In `deviceQueries.ts` import `searchOwnerCandidates` and add after `ownerProfile`:

```ts
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
```

- [x] **Step 6: Mock data**

`customerMockData.ts`: add `address: string;` to `Customer` and an `address` to each customer:

- `CUS-2001`: `'Số 12 ngõ 45 Kim Giang, Phường Hoàng Mai, Hà Nội'`
- `CUS-2002`: `'Số 88 Nguyễn Trãi, Phường Bến Thành, TP. Hồ Chí Minh'`
- `CUS-2003`: `'Số 5 Lê Duẩn, Phường Hải Châu, Đà Nẵng'`
- `CUS-2004`: `'Số 21 Hòa Bình, Phường An Cư, Cần Thơ'`

`src/mocks/fixtures/devices.ts`: owner becomes

```ts
      owner: {
        id: ownerId,
        name: customer.name,
        phone_masked: customer.phone,
        address: customer.address,
      },
```

and the shared member becomes

```ts
              {
                id: `member-${number}`,
                name: `Thành viên chia sẻ ${number}`,
                phone: `09${String(number).padStart(2, '0')}xxxx${String(number * 7).padStart(3, '0').slice(-3)}`,
                address: `Số ${number} đường Kim Giang, ${region}`,
                permission: number % 2 === 0 ? 'control' : 'view',
                shared_at: activatedAt,
              },
```

- [x] **Step 7: Mock handlers**

In `handlers.ts`, add `OwnerCandidateDto` and `OwnerMutationResultDto` to the `deviceDetailSchemas` type import. Add this helper next to `appendOperationLog`:

```ts
// Ends the open ownership period so the history keeps who owned the device when.
function closeOwnerHistory(
  device: DeviceDto,
  endedAt: string,
  reason: string
): NonNullable<DeviceDto['owner_history']> {
  return (device.owner_history ?? []).map((entry) =>
    entry.ended_at ? entry : { ...entry, ended_at: endedAt, reason }
  );
}

async function readReason(request: Request): Promise<string | undefined> {
  const body = (await request.json().catch(() => null)) as {
    reason?: string;
  } | null;
  return body?.reason?.trim() || undefined;
}
```

Then add these handlers right after the `http.get('/api/devices/:deviceId/owner', …)` handler:

```ts
  http.get('/api/devices/:deviceId/owner-candidates', ({ request }) => {
    if (!allowed('device.owner.update')) return deviceError('forbidden', 403);
    const query =
      new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
    if (query.length < 2) return HttpResponse.json([]);
    const candidates: OwnerCandidateDto[] = customerMockData
      .filter(
        (customer) =>
          customer.phone.toLowerCase().includes(query) ||
          customer.id.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      }));
    return HttpResponse.json(candidates);
  }),
  http.put('/api/devices/:deviceId/owner', async ({ params, request }) => {
    if (!allowed('device.owner.update')) return deviceError('forbidden', 403);
    const body = (await request.json().catch(() => null)) as {
      customer_id?: string;
      reason?: string;
    } | null;
    const reason = body?.reason?.trim();
    if (!body?.customer_id || !reason) return deviceError('invalidInput', 400);
    const index = findDeviceIndex(String(params.deviceId));
    const current = deviceStore[index];
    if (!current) return deviceError('notFound', 404);
    const customer = customerMockData.find(
      (item) => item.id === body.customer_id
    );
    if (!customer) return deviceError('customerNotFound', 404);
    if (current.owner?.id === customer.id)
      return deviceError('sameOwner', 422);
    const now = new Date().toISOString();
    const owner = {
      id: customer.id,
      name: customer.name,
      phone_masked: customer.phone,
      address: customer.address,
    };
    deviceStore[index] = appendOperationLog(
      {
        ...current,
        owner,
        app_sync_status: 'queued',
        owner_history: [
          ...closeOwnerHistory(current, now, reason),
          { owner_id: customer.id, owner_name: customer.name, started_at: now },
        ],
      },
      'change_owner',
      reason,
      JSON.stringify({ owner: current.owner ?? null }),
      JSON.stringify({ owner })
    );
    const result: OwnerMutationResultDto = {
      previous_owner_notified: Boolean(current.owner),
    };
    return HttpResponse.json(result);
  }),
  http.post(
    '/api/devices/:deviceId/owner/remove',
    async ({ params, request }) => {
      if (!allowed('device.lifecycle')) return deviceError('forbidden', 403);
      const reason = await readReason(request);
      if (!reason) return deviceError('invalidInput', 400);
      const index = findDeviceIndex(String(params.deviceId));
      const current = deviceStore[index];
      if (!current) return deviceError('notFound', 404);
      if (!current.owner) return deviceError('noOwner', 409);
      deviceStore[index] = appendOperationLog(
        {
          ...current,
          owner: undefined,
          app_sync_status: 'queued',
          owner_history: closeOwnerHistory(
            current,
            new Date().toISOString(),
            reason
          ),
        },
        'remove_owner',
        reason,
        JSON.stringify({ owner: current.owner }),
        JSON.stringify({ owner: null })
      );
      const result: OwnerMutationResultDto = { previous_owner_notified: true };
      return HttpResponse.json(result);
    }
  ),
  http.post(
    '/api/devices/:deviceId/shared-members/:memberId/revoke',
    async ({ params, request }) => {
      if (!allowed('device.lifecycle')) return deviceError('forbidden', 403);
      const reason = await readReason(request);
      if (!reason) return deviceError('invalidInput', 400);
      const index = findDeviceIndex(String(params.deviceId));
      const current = deviceStore[index];
      if (!current) return deviceError('notFound', 404);
      const members = current.shared_members ?? [];
      const member = members.find((item) => item.id === params.memberId);
      if (!member) return deviceError('notFound', 404);
      deviceStore[index] = appendOperationLog(
        {
          ...current,
          shared_members: members.filter((item) => item.id !== member.id),
          app_sync_status: 'queued',
        },
        'revoke_sharing',
        reason,
        JSON.stringify({ shared_members: [member] }),
        JSON.stringify({ shared_members: [] })
      );
      return new HttpResponse(null, { status: 204 });
    }
  ),
```

- [x] **Step 8: i18n**

`errors` — add:

- vi: `"sameOwner": "Khách hàng này đã là chủ sở hữu hiện tại."`, `"noOwner": "Thiết bị chưa có chủ sở hữu."`
- en: `"sameOwner": "This customer already owns the device."`, `"noOwner": "The device has no owner."`

`operationLog.actions` — add:

- vi: `"change_owner": "Đổi chủ sở hữu"`, `"remove_owner": "Xóa chủ sở hữu"`
- en: `"change_owner": "Change owner"`, `"remove_owner": "Remove owner"`

`operationLog.fields` — add:

- vi: `"phone_masked": "Số điện thoại"`, `"phone": "Số điện thoại"`, `"address": "Địa chỉ"`, `"permission": "Quyền chia sẻ"`
- en: `"phone_masked": "Phone"`, `"phone": "Phone"`, `"address": "Address"`, `"permission": "Share permission"`

- [x] **Step 9: Check**

Run (PowerShell): `pnpm typecheck; if ($?) { pnpm lint }`
Expected: both exit 0.

- [ ] **Step 10: Manual API check**

`pnpm dev`, sign in as `admin`, open `/devices/KGR-0001`, then in the DevTools console:

```js
await (await fetch('/api/devices/KGR-0001/owner-candidates?q=091')).json();
// → [{ id: 'CUS-2002', name: 'Trần Thị B', phone: '091xxxx456', address: … }]
await (await fetch('/api/devices/KGR-0001/owner', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: 'CUS-2002', reason: 'Khách chuyển nhượng' }) })).json();
// → { previous_owner_notified: true }
```

Reload the page: the owner is Trần Thị B and the operation log has a "Đổi chủ sở hữu" entry with before/after. Repeat the PUT with the same `customer_id` → HTTP 422.

- [x] **Step 11: Commit**

```bash
git add src/features/devices src/features/customers/mocks/customerMockData.ts src/mocks
git commit -m "feat(devices): add owner change, removal and share revoke api"
```

---

### Task 3: Owner management UI

**Files:**

- Create: `src/features/devices/components/DeviceReasonConfirmDialog.tsx`
- Create: `src/features/devices/components/DeviceOwnerChangeDialog.tsx`
- Modify: `src/features/devices/components/DeviceOwnershipPanel.tsx` (full rewrite)
- Modify: `src/features/devices/locales/vi.json`, `en.json` (`ownership`)

**Interfaces:**

- Consumes (Task 2): `changeDeviceOwner`, `removeDeviceOwner`, `revokeSharedMember`, `deviceQueries.ownerCandidates`, `DeviceSharedMember`, `SharePermission`, `DeviceOwner.address`.
- Produces: `DeviceReasonConfirmDialog` props `{ open: boolean; title: string; warning: string; okText: string; pending: boolean; onCancel: () => void; onConfirm: (reason: string) => void }`; `DeviceOwnerChangeDialog` props `{ device: Device; open: boolean; onClose: () => void }`. `DeviceOwnershipPanel` keeps its props `{ device; onOwnerClick }`.

- [x] **Step 1: i18n**

Replace the `ownership` object in `vi.json` with:

```json
  "ownership": {
    "title": "Quản lý chủ sở hữu",
    "currentOwner": "Chủ hiện tại",
    "noOwner": "Chưa gán chủ sở hữu",
    "phone": "SĐT",
    "address": "Địa chỉ",
    "sharedMembers": "Danh sách chia sẻ",
    "noSharedMembers": "Chưa chia sẻ cho ai.",
    "columns": {
      "name": "Tên",
      "phone": "SĐT",
      "address": "Địa chỉ",
      "permission": "Quyền",
      "actions": ""
    },
    "permission": {
      "control": "Điều khiển",
      "view": "Chỉ xem"
    },
    "history": "Lịch sử chủ sở hữu",
    "present": "Hiện tại",
    "endReason": "Lý do",
    "deleteRecord": "Xóa bản ghi",
    "change": "Đổi chủ sở hữu",
    "changeTitle": "Đổi chủ sở hữu thiết bị",
    "changeWarning": "Chủ cũ sẽ mất quyền điều khiển máy trên App và nhận thông báo. Thao tác được ghi nhật ký.",
    "newOwner": "Chủ sở hữu mới",
    "newOwnerHint": "Tìm theo SĐT hoặc mã khách hàng",
    "searchMin": "Nhập ít nhất 2 ký tự",
    "noCandidates": "Không tìm thấy khách hàng",
    "changeConfirm": "Đổi chủ",
    "changeSuccess": "Đã đổi chủ sở hữu.",
    "changeSuccessNotified": "Đã đổi chủ sở hữu và gửi thông báo cho chủ cũ.",
    "remove": "Xóa chủ sở hữu",
    "removeTitle": "Xóa chủ sở hữu",
    "removeWarning": "Khách hàng sẽ mất quyền điều khiển máy trên App và nhận thông báo. Thao tác được ghi nhật ký.",
    "removeConfirm": "Xóa chủ",
    "removeSuccess": "Đã xóa chủ sở hữu.",
    "removeSuccessNotified": "Đã xóa chủ sở hữu và gửi thông báo cho khách hàng.",
    "revoke": "Thu hồi",
    "revokeTitle": "Thu hồi chia sẻ của {{name}}",
    "revokeWarning": "Thành viên này sẽ mất quyền truy cập thiết bị trên App. Thao tác được ghi nhật ký.",
    "revokeConfirm": "Thu hồi",
    "revokeSuccess": "Đã thu hồi chia sẻ.",
    "reason": "Lý do",
    "cancel": "Hủy",
    "error": "Không thể hoàn tất thao tác."
  },
```

and in `en.json` with:

```json
  "ownership": {
    "title": "Owner management",
    "currentOwner": "Current owner",
    "noOwner": "No owner assigned",
    "phone": "Phone",
    "address": "Address",
    "sharedMembers": "Shared with",
    "noSharedMembers": "Not shared with anyone.",
    "columns": {
      "name": "Name",
      "phone": "Phone",
      "address": "Address",
      "permission": "Permission",
      "actions": ""
    },
    "permission": {
      "control": "Control",
      "view": "View only"
    },
    "history": "Ownership history",
    "present": "Present",
    "endReason": "Reason",
    "deleteRecord": "Delete record",
    "change": "Change owner",
    "changeTitle": "Change device owner",
    "changeWarning": "The previous owner loses control of the device in the app and is notified. This action is audited.",
    "newOwner": "New owner",
    "newOwnerHint": "Search by phone or customer ID",
    "searchMin": "Type at least 2 characters",
    "noCandidates": "No customer found",
    "changeConfirm": "Change owner",
    "changeSuccess": "Owner changed.",
    "changeSuccessNotified": "Owner changed and the previous owner was notified.",
    "remove": "Remove owner",
    "removeTitle": "Remove owner",
    "removeWarning": "The customer loses control of the device in the app and is notified. This action is audited.",
    "removeConfirm": "Remove owner",
    "removeSuccess": "Owner removed.",
    "removeSuccessNotified": "Owner removed and the customer was notified.",
    "revoke": "Revoke",
    "revokeTitle": "Revoke sharing for {{name}}",
    "revokeWarning": "This member loses access to the device in the app. This action is audited.",
    "revokeConfirm": "Revoke",
    "revokeSuccess": "Sharing revoked.",
    "reason": "Reason",
    "cancel": "Cancel",
    "error": "Could not complete the action."
  },
```

- [x] **Step 2: `DeviceReasonConfirmDialog`**

Create `src/features/devices/components/DeviceReasonConfirmDialog.tsx`:

```tsx
import { Alert, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export interface DeviceReasonConfirmDialogProps {
  open: boolean;
  title: string;
  /** Impact on the customer, shown above the reason field. */
  warning: string;
  okText: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

interface FormValues {
  reason: string;
}

// §3.4b: every destructive ownership change needs a reason for the audit log.
export function DeviceReasonConfirmDialog({
  open,
  title,
  warning,
  okText,
  pending,
  onCancel,
  onConfirm,
}: DeviceReasonConfirmDialogProps) {
  const { t } = useTranslation('devices');
  const [form] = Form.useForm<FormValues>();

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={pending}
      okText={okText}
      cancelText={t('ownership.cancel')}
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <Alert type="warning" showIcon message={warning} className="mb-4" />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => onConfirm(values.reason.trim())}
      >
        <Form.Item
          name="reason"
          label={t('ownership.reason')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('validation.required'),
            },
          ]}
        >
          <Input.TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [x] **Step 3: `DeviceOwnerChangeDialog`**

Create `src/features/devices/components/DeviceOwnerChangeDialog.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';

import { changeDeviceOwner } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';

export interface DeviceOwnerChangeDialogProps {
  device: Device;
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  customerId: string;
  reason: string;
}

const SEARCH_DEBOUNCE_MS = 300;

// §3.4b: transfer to an existing customer only — never a free-text owner.
export function DeviceOwnerChangeDialog({
  device,
  open,
  onClose,
}: DeviceOwnerChangeDialogProps) {
  const { t } = useTranslation('devices');
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const candidates = useQuery(
    deviceQueries.ownerCandidates(device.id, search)
  );

  const close = () => {
    setInput('');
    setSearch('');
    onClose();
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      changeDeviceOwner(device.id, values.customerId, values.reason.trim()),
    onSuccess: (result) => {
      void message.success(
        t(
          result.previousOwnerNotified
            ? 'ownership.changeSuccessNotified'
            : 'ownership.changeSuccess'
        )
      );
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
      close();
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('ownership.error'));
    },
  });

  return (
    <Modal
      title={t('ownership.changeTitle')}
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText={t('ownership.changeConfirm')}
      cancelText={t('ownership.cancel')}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        message={t('ownership.changeWarning')}
        className="mb-4"
      />
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="customerId"
          label={t('ownership.newOwner')}
          rules={[{ required: true, message: t('validation.required') }]}
        >
          <Select
            showSearch
            filterOption={false}
            onSearch={setInput}
            placeholder={t('ownership.newOwnerHint')}
            loading={candidates.isFetching}
            notFoundContent={
              input.trim().length < 2
                ? t('ownership.searchMin')
                : t('ownership.noCandidates')
            }
            options={(candidates.data ?? []).map((candidate) => ({
              value: candidate.id,
              label: `${candidate.name} · ${candidate.phone} · ${candidate.id}`,
              disabled: candidate.id === device.owner?.id,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="reason"
          label={t('ownership.reason')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('validation.required'),
            },
          ]}
        >
          <Input.TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [x] **Step 4: Rewrite `DeviceOwnershipPanel`**

Replace the whole file with:

```tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Table, Timeline, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/error';
import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalBadge, PortalCard } from '@/shared/components/portal';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';

import { removeDeviceOwner, revokeSharedMember } from '../api/deviceDetailApi';
import { deviceQueries } from '../queries/deviceQueries';
import type { Device, DeviceSharedMember } from '../schemas/deviceSchemas';
import { DeviceOwnerChangeDialog } from './DeviceOwnerChangeDialog';
import { DeviceReasonConfirmDialog } from './DeviceReasonConfirmDialog';

export interface DeviceOwnershipPanelProps {
  device: Device;
  onOwnerClick: () => void;
}

type Removal = { kind: 'owner' } | { kind: 'member'; member: DeviceSharedMember };

// §3.4b — rendered only for device.pii.full. Change owner needs
// device.owner.update; removing the owner or a shared member is the D cell
// (device.lifecycle), so service center can edit but not remove.
export function DeviceOwnershipPanel({
  device,
  onOwnerClick,
}: DeviceOwnershipPanelProps) {
  const { t, i18n } = useTranslation('devices');
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [changeOpen, setChangeOpen] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const canRemove = Boolean(
    session && hasCapability(session.role, 'device.lifecycle')
  );

  const remove = useMutation({
    mutationFn: async ({
      target,
      reason,
    }: {
      target: Removal;
      reason: string;
    }): Promise<string> => {
      if (target.kind === 'owner') {
        const result = await removeDeviceOwner(device.id, reason);
        return result.previousOwnerNotified
          ? 'ownership.removeSuccessNotified'
          : 'ownership.removeSuccess';
      }
      await revokeSharedMember(device.id, target.member.id, reason);
      return 'ownership.revokeSuccess';
    },
    onSuccess: (successKey) => {
      void message.success(t(successKey));
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
      setRemoval(null);
    },
    onError: (error: unknown) => {
      const description = error instanceof ApiError ? error.message : undefined;
      void message.error(description || t('ownership.error'));
    },
  });

  const dialog =
    removal?.kind === 'owner'
      ? {
          title: t('ownership.removeTitle'),
          warning: t('ownership.removeWarning'),
          okText: t('ownership.removeConfirm'),
        }
      : removal?.kind === 'member'
        ? {
            title: t('ownership.revokeTitle', { name: removal.member.name }),
            warning: t('ownership.revokeWarning'),
            okText: t('ownership.revokeConfirm'),
          }
        : { title: '', warning: '', okText: '' };

  return (
    <PortalCard title={t('ownership.title')}>
      <div className="space-y-5">
        <div>
          <p className="m-0 text-xs font-medium uppercase text-[#636466]">
            {t('ownership.currentOwner')}
          </p>
          {device.owner ? (
            <div className="mt-2 space-y-1 text-sm">
              <button
                type="button"
                onClick={onOwnerClick}
                className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-[#F16522] hover:underline"
              >
                {device.owner.name ?? device.owner.id}
              </button>
              <p className="m-0 text-[#636466]">
                {t('ownership.phone')}:{' '}
                <span className="font-mono text-[#020204]">
                  {device.owner.phoneMasked ?? '—'}
                </span>
              </p>
              <p className="m-0 text-[#636466]">
                {t('ownership.address')}:{' '}
                <span className="text-[#020204]">
                  {device.owner.address ?? '—'}
                </span>
              </p>
            </div>
          ) : (
            <p className="mb-0 mt-2 text-sm text-[#636466]">
              {t('ownership.noOwner')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <PermissionGuard capability="device.owner.update">
              <Button size="small" onClick={() => setChangeOpen(true)}>
                {t('ownership.change')}
              </Button>
            </PermissionGuard>
            {device.owner ? (
              <PermissionGuard capability="device.lifecycle">
                <Button
                  size="small"
                  danger
                  onClick={() => setRemoval({ kind: 'owner' })}
                >
                  {t('ownership.remove')}
                </Button>
              </PermissionGuard>
            ) : null}
          </div>
        </div>

        <div>
          <p className="m-0 text-xs font-medium uppercase text-[#636466]">
            {t('ownership.sharedMembers')}
          </p>
          <Table<DeviceSharedMember>
            className="mt-2"
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 520 }}
            dataSource={device.sharedMembers}
            locale={{ emptyText: t('ownership.noSharedMembers') }}
            columns={[
              { title: t('ownership.columns.name'), dataIndex: 'name' },
              {
                title: t('ownership.columns.phone'),
                dataIndex: 'phone',
                render: (value?: string) => (
                  <span className="font-mono">{value ?? '—'}</span>
                ),
              },
              {
                title: t('ownership.columns.address'),
                dataIndex: 'address',
                render: (value?: string) => value ?? '—',
              },
              {
                title: t('ownership.columns.permission'),
                dataIndex: 'permission',
                render: (value: DeviceSharedMember['permission']) => (
                  <PortalBadge tone={value === 'control' ? 'info' : 'primary'}>
                    {t('ownership.permission.' + value)}
                  </PortalBadge>
                ),
              },
              ...(canRemove
                ? [
                    {
                      title: t('ownership.columns.actions'),
                      key: 'actions',
                      render: (_: unknown, member: DeviceSharedMember) => (
                        <Button
                          size="small"
                          danger
                          type="link"
                          onClick={() =>
                            setRemoval({ kind: 'member', member })
                          }
                        >
                          {t('ownership.revoke')}
                        </Button>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div>
          <p className="m-0 text-xs font-medium uppercase text-[#636466]">
            {t('ownership.history')}
          </p>
          <Timeline
            className="mt-3"
            items={device.ownerHistory.map((entry) => ({
              children: (
                <div>
                  <p className="m-0 text-sm font-semibold">{entry.ownerName}</p>
                  <p className="mb-0 mt-1 text-xs text-[#636466]">
                    {formatDateTime(entry.startedAt, i18n.resolvedLanguage)} —{' '}
                    {entry.endedAt
                      ? formatDateTime(entry.endedAt, i18n.resolvedLanguage)
                      : t('ownership.present')}
                  </p>
                  {entry.reason ? (
                    <p className="mb-0 mt-1 text-xs text-[#636466]">
                      {t('ownership.endReason')}: {entry.reason}
                    </p>
                  ) : null}
                </div>
              ),
            }))}
          />
        </div>
      </div>

      <PermissionGuard capability="device.owner.update">
        <DeviceOwnerChangeDialog
          device={device}
          open={changeOpen}
          onClose={() => setChangeOpen(false)}
        />
      </PermissionGuard>
      <DeviceReasonConfirmDialog
        open={removal !== null}
        title={dialog.title}
        warning={dialog.warning}
        okText={dialog.okText}
        pending={remove.isPending}
        onCancel={() => setRemoval(null)}
        onConfirm={(reason) => {
          if (removal) remove.mutate({ target: removal, reason });
        }}
      />
    </PortalCard>
  );
}
```

- [x] **Step 5: Check**

Run (PowerShell): `pnpm typecheck; if ($?) { pnpm lint }`
Expected: both exit 0.

- [ ] **Step 6: Manual MSW check**

On `/devices/KGR-0001`:

- `admin`: panel shows owner name/phone/address, "Đổi chủ sở hữu", "Xóa chủ sở hữu", shared table with a "Thu hồi" column. Change owner: typing "09" lists customers, the current owner is disabled, submit without reason is blocked, submit with reason → toast "…gửi thông báo cho chủ cũ", header and panel show the new owner, history timeline closes the old period, operation log gains "Đổi chủ sở hữu". Revoke the member → row disappears, log gains "Thu hồi chia sẻ". Remove owner → "Chưa gán chủ sở hữu".
- `service_center` (reload to reset mock state): "Đổi chủ sở hữu" visible; no "Xóa chủ sở hữu" button and no "Thu hồi" column.

- [x] **Step 7: Commit**

```bash
git add src/features/devices
git commit -m "feat(devices): manage owner and shared members from device detail"
```

---

### Task 4: Water in/out chart and filter core health

**Files:**

- Modify: `src/features/devices/schemas/deviceDetailSchemas.ts` (telemetry point, filter core status)
- Modify: `src/features/devices/api/deviceDetailApi.ts` (`getTelemetryHistory`, `getFilterCoreStatuses`)
- Create: `src/features/devices/utils/coreHealth.ts`
- Modify: `src/mocks/handlers.ts` (`buildTelemetryHistory`, `/filter-cores`)
- Modify: `src/features/devices/components/DeviceTelemetryPanel.tsx`
- Modify: `src/features/devices/components/DeviceFilterCoresPanel.tsx` (full rewrite)
- Modify: `src/features/devices/locales/vi.json`, `en.json` (`telemetry`, `filterCores`)

**Interfaces:**

- Produces: `TelemetryPoint { measuredAt: string; tdsInPpm: number | null; tdsOutPpm: number | null }`; `FilterCoreStatus { position; coreName; coreType: string; purpose?: string; skuName?; remainingDays; totalDays; poorPercent: number; criticalPercent: number }` (`warningDays` is dropped from the model; the DTO keeps `warning_days`); `remainingPercent(remainingDays: number, totalDays: number): number`; `coreHealth(remaining: number, poorPercent: number, criticalPercent: number): CoreHealth` with `type CoreHealth = 'good' | 'poor' | 'critical'`.

- [x] **Step 1: Schemas**

In `deviceDetailSchemas.ts` replace the telemetry block (comment through `TelemetryPoint`) with:

```ts
// §3.4 water quality chart — TDS in (source) and out (drinking) over a window.
export const telemetryRangeSchema = z.enum(['24h', '7d', '30d']);
export type TelemetryRange = z.infer<typeof telemetryRangeSchema>;
export const telemetryPointDtoSchema = z.object({
  measured_at: z.string().datetime({ offset: true }),
  tds_in_ppm: z.number().nullable(),
  tds_out_ppm: z.number().nullable(),
});
export type TelemetryPointDto = z.infer<typeof telemetryPointDtoSchema>;
export interface TelemetryPoint {
  measuredAt: string;
  tdsInPpm: number | null;
  tdsOutPpm: number | null;
}
```

and the filter-core block (comment through `FilterCoreStatus`) with:

```ts
// Per-core remaining life plus the health thresholds from the M04.1 config
// (§3.4: tốt / kém / quá kém). The UI compares, never invents, thresholds.
export const filterCoreStatusDtoSchema = z.object({
  position: z.string().min(1),
  core_name: z.string().min(1),
  core_type: z.string().min(1),
  function: z.string().min(1).optional(),
  sku_name: z.string().min(1).optional(),
  remaining_days: z.number().int(),
  total_days: z.number().int().positive(),
  warning_days: z.number().int().nonnegative(),
  poor_percent: z.number().min(0).max(100),
  critical_percent: z.number().min(0).max(100),
});
export type FilterCoreStatusDto = z.infer<typeof filterCoreStatusDtoSchema>;
export interface FilterCoreStatus {
  position: string;
  coreName: string;
  coreType: string;
  purpose?: string;
  skuName?: string;
  remainingDays: number;
  totalDays: number;
  poorPercent: number;
  criticalPercent: number;
}
```

- [x] **Step 2: API mapping**

In `getTelemetryHistory` the map becomes:

```ts
  return parsed.data.map((item) => ({
    measuredAt: item.measured_at,
    tdsInPpm: item.tds_in_ppm,
    tdsOutPpm: item.tds_out_ppm,
  }));
```

In `getFilterCoreStatuses`:

```ts
  return parsed.data.map((item) => ({
    position: item.position,
    coreName: item.core_name,
    coreType: item.core_type,
    ...(item.function && { purpose: item.function }),
    ...(item.sku_name && { skuName: item.sku_name }),
    remainingDays: item.remaining_days,
    totalDays: item.total_days,
    poorPercent: item.poor_percent,
    criticalPercent: item.critical_percent,
  }));
```

- [x] **Step 3: `coreHealth` util**

Create `src/features/devices/utils/coreHealth.ts`:

```ts
export type CoreHealth = 'good' | 'poor' | 'critical';

export function remainingPercent(
  remainingDays: number,
  totalDays: number
): number {
  if (totalDays <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((remainingDays / totalDays) * 100))
  );
}

// Thresholds come per core from the M04.1 config — never hard-code them here.
export function coreHealth(
  remaining: number,
  poorPercent: number,
  criticalPercent: number
): CoreHealth {
  if (remaining <= criticalPercent) return 'critical';
  if (remaining <= poorPercent) return 'poor';
  return 'good';
}
```

Sanity values (verify mentally, no test runner): `coreHealth(100, 30, 10)` → `good`; `coreHealth(30, 30, 10)` → `poor`; `coreHealth(10, 30, 10)` → `critical`; `remainingPercent(45, 180)` → `25`; `remainingPercent(-5, 180)` → `0`.

- [x] **Step 4: Mock telemetry**

In `buildTelemetryHistory` (handlers.ts) replace the returned object with:

```ts
    return {
      measured_at: new Date(now - (count - 1 - i) * stepMs).toISOString(),
      tds_in_ppm: Math.round(260 + 90 * Math.sin(phase / 4) + (phase % 7) * 5),
      tds_out_ppm: Math.round(34 + 5 * Math.sin(phase / 2.5) + (phase % 3)),
    };
```

- [x] **Step 5: Mock filter cores**

Above the `handlers` array in `handlers.ts` add:

```ts
// ponytail: the M04.1 config has no per-core function text or health
// thresholds yet; these stand in until it does (spec example: 30% / 10%).
const CORE_FUNCTIONS: Record<string, string> = {
  'CORE-PP': 'Lọc cặn thô, rỉ sét',
  'CORE-PP-ALUM': 'Xử lý phèn, cặn mịn',
  'CORE-CARBON': 'Khử clo, mùi và màu',
  'CORE-RO': 'Loại bỏ ion kim loại, vi khuẩn',
  'CORE-POST': 'Cân bằng vị nước',
  'CORE-MINERAL': 'Bổ sung khoáng chất',
  'CORE-HYDROGEN': 'Tạo nước giàu hydrogen',
};
const CORE_POOR_PERCENT = 30;
const CORE_CRITICAL_PERCENT = 10;
```

In the `/filter-cores` handler, the pushed object becomes:

```ts
          {
            position: core.position,
            core_name: core.core_name,
            core_type: sku.sku.replace(/^CORE-/, ''),
            ...(CORE_FUNCTIONS[sku.sku] && {
              function: CORE_FUNCTIONS[sku.sku],
            }),
            sku_name: sku.name,
            remaining_days: Math.max(
              0,
              Math.round((totalDays * (100 - used)) / 100)
            ),
            total_days: totalDays,
            warning_days: Math.round(
              (totalDays * (100 - sku.warning_level2_percent)) / 100
            ),
            poor_percent: CORE_POOR_PERCENT,
            critical_percent: CORE_CRITICAL_PERCENT,
          },
```

- [x] **Step 6: i18n**

Replace the `telemetry` object — vi:

```json
  "telemetry": {
    "title": "Chất lượng nước vào/ra",
    "description": "TDS nước nguồn và nước đầu ra theo thời gian · bấm chú thích để ẩn/hiện từng đường",
    "ranges": { "24h": "24h", "7d": "7 ngày", "30d": "30 ngày" },
    "series": { "tdsIn": "TDS vào", "tdsOut": "TDS ra" },
    "error": "Không thể tải dữ liệu chất lượng nước.",
    "empty": "Không có dữ liệu trong khoảng thời gian này."
  },
```

en:

```json
  "telemetry": {
    "title": "Water quality in/out",
    "description": "Source and output TDS over time · click the legend to show/hide a line",
    "ranges": { "24h": "24h", "7d": "7d", "30d": "30d" },
    "series": { "tdsIn": "TDS in", "tdsOut": "TDS out" },
    "error": "Could not load water quality data.",
    "empty": "No data in this range."
  },
```

Replace the `filterCores` object — vi:

```json
  "filterCores": {
    "title": "Trạng thái lõi lọc",
    "description": "Thời gian còn lại của từng lõi theo cấu hình tuổi thọ",
    "loading": "Đang tải…",
    "empty": "Model này chưa cấu hình lõi lọc.",
    "error": "Không thể tải trạng thái lõi lọc.",
    "levels_other": "{{count}} cấp lọc",
    "level": "Cấp {{index}}",
    "columns": {
      "level": "Cấp lọc",
      "type": "Loại lõi",
      "core": "Tên & chức năng",
      "time": "Thời gian còn lại",
      "status": "Trạng thái"
    },
    "remainingOfTotal": "Còn {{remaining}} / {{total}} ngày",
    "remainingPercent": "{{percent}}%",
    "health": { "good": "Tốt", "poor": "Kém", "critical": "Quá kém" }
  },
```

en:

```json
  "filterCores": {
    "title": "Filter core status",
    "description": "Remaining life of each core per the lifespan configuration",
    "loading": "Loading…",
    "empty": "This model has no configured filter cores.",
    "error": "Could not load filter core status.",
    "levels_one": "{{count}} stage",
    "levels_other": "{{count}} stages",
    "level": "Stage {{index}}",
    "columns": {
      "level": "Stage",
      "type": "Core type",
      "core": "Name & function",
      "time": "Time left",
      "status": "Status"
    },
    "remainingOfTotal": "{{remaining}} / {{total}} days left",
    "remainingPercent": "{{percent}}%",
    "health": { "good": "Good", "poor": "Poor", "critical": "Very poor" }
  },
```

- [x] **Step 7: Telemetry panel**

In `DeviceTelemetryPanel.tsx`:

1. Update the top comment to `// §3.4 — TDS in/out over the selected window. The range is local view state, not shareable page state.`
2. Replace the `series` array with:

```ts
    const series = [
      {
        name: t('telemetry.series.tdsIn'),
        color: referenceColors.warning,
        values: points.map((point) => point.tdsInPpm),
      },
      {
        name: t('telemetry.series.tdsOut'),
        color: referenceColors.water,
        values: points.map((point) => point.tdsOutPpm),
      },
    ];
```

3. In the returned option add, before `legend`:

```ts
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) =>
          typeof value === 'number' ? `${value} ppm` : '—',
      },
```

4. In `yAxis` add `name: 'ppm',` and `nameTextStyle: { color: '#636466', fontSize: 11 },`.

The ECharts legend already toggles each series on click; no extra code.

- [x] **Step 8: Filter cores panel**

Replace `DeviceFilterCoresPanel.tsx` with:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  PortalBadge,
  PortalCard,
  PortalProgress,
} from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import {
  coreHealth,
  remainingPercent,
  type CoreHealth,
} from '../utils/coreHealth';

const healthTone: Record<CoreHealth, PortalTone> = {
  good: 'primary',
  poor: 'warning',
  critical: 'danger',
};

const healthRowClass: Record<CoreHealth, string> = {
  good: '',
  poor: 'bg-[#FFFBEB]',
  critical: 'bg-[#FEF3F2]',
};

// §3.4 — remaining life per core; thresholds come from the M04.1 config,
// the same source that drives the core-alert block.
export function DeviceFilterCoresPanel({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const cores = useQuery(deviceQueries.filterCores(device.id));

  return (
    <PortalCard
      title={
        <div>
          <div className="flex items-center gap-2">
            {t('filterCores.title')}
            {cores.data?.length ? (
              <PortalBadge tone="info">
                {t('filterCores.levels', { count: cores.data.length })}
              </PortalBadge>
            ) : null}
          </div>
          <p className="m-0 text-xs font-normal text-[#636466]">
            {t('filterCores.description')}
          </p>
        </div>
      }
    >
      {!cores.data?.length ? (
        <p className="m-0 text-sm text-[#636466]">
          {cores.isPending
            ? t('filterCores.loading')
            : cores.isError
              ? t('filterCores.error')
              : t('filterCores.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-solid border-[#EEEFEF]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#F7F8FA] text-left text-xs uppercase text-[#636466]">
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.level')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.type')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.core')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('filterCores.columns.time')}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t('filterCores.columns.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {cores.data.map((core, index) => {
                const percent = remainingPercent(
                  core.remainingDays,
                  core.totalDays
                );
                const health = coreHealth(
                  percent,
                  core.poorPercent,
                  core.criticalPercent
                );
                return (
                  <tr
                    key={core.position}
                    className={`border-0 border-t border-solid border-[#EEEFEF] ${healthRowClass[health]}`}
                  >
                    <td className="px-4 py-3">
                      <PortalBadge tone="info">
                        {t('filterCores.level', {
                          index: String(index + 1).padStart(2, '0'),
                        })}
                      </PortalBadge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#020204]">
                      {core.coreType}
                    </td>
                    <td className="px-4 py-3">
                      <p className="m-0 font-semibold text-[#020204]">
                        {core.coreName}
                      </p>
                      {core.purpose || core.skuName ? (
                        <p className="m-0 text-xs text-[#636466]">
                          {[core.purpose, core.skuName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="w-[32%] px-4 py-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[#636466]">
                          {t('filterCores.remainingOfTotal', {
                            remaining: Math.max(0, core.remainingDays),
                            total: core.totalDays,
                          })}
                        </span>
                        <span className="font-semibold text-[#020204]">
                          {t('filterCores.remainingPercent', { percent })}
                        </span>
                      </div>
                      <PortalProgress
                        value={percent}
                        max={100}
                        tone={healthTone[health]}
                        className="h-1.5"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PortalBadge tone={healthTone[health]} dot>
                        {t('filterCores.health.' + health)}
                      </PortalBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PortalCard>
  );
}
```

Before relying on `tone="danger"`, confirm `PortalProgressProps['tone']` accepts `PortalTone` (`src/shared/components/portal/PortalProgress.tsx`). If it only accepts a subset, map `critical` to the closest accepted tone and note it in the commit body.

- [x] **Step 9: Check**

Run (PowerShell): `pnpm typecheck; if ($?) { pnpm lint }`
Expected: both exit 0. `rg "tdsPpm|flowLpm|temperatureC|warningDays|usedOfTotal|replaceSoon" src` → no matches.

- [ ] **Step 10: Manual MSW check**

As `factory` on `/devices/KGR-0001`: chart title "Chất lượng nước vào/ra" with two lines (TDS vào ~170–380, TDS ra ~30–45); clicking a legend item hides that line; hovering shows both values with "ppm"; 24h/7d/30d all load. Filter cores: 5 rows with type (PP, CARBON, RO, POST, MINERAL), name + function, "Còn x / y ngày", a remaining-% bar, and badges Tốt / Kém / Quá kém consistent with 30% / 10%.

- [x] **Step 11: Commit**

```bash
git add src/features/devices src/mocks/handlers.ts
git commit -m "feat(devices): chart water in/out and grade filter core health"
```

---

### Task 5: Connectivity history, history export, lock and control state

**Files:**

- Modify: `src/core/permissions/capabilities.ts`
- Modify: `src/core/permissions/permissionCatalog.ts`
- Modify: `src/features/devices/schemas/deviceDetailSchemas.ts`
- Modify: `src/features/devices/api/deviceDetailApi.ts`
- Modify: `src/features/devices/queries/deviceQueries.ts`
- Modify: `src/mocks/fixtures/deviceDetailFixtures.ts`
- Modify: `src/mocks/handlers.ts` (`mutateDevice`, new `/connectivity-history`)
- Modify: `src/features/devices/components/DeviceHistoryPanel.tsx` (full rewrite)
- Modify: `src/features/devices/components/DeviceLifecycleActions.tsx`
- Modify: `src/features/devices/components/DeviceOverview.tsx`
- Modify: `src/features/devices/pages/DeviceDetailPage.tsx`
- Modify: `src/features/devices/locales/vi.json`, `en.json` (`history`, `controlState`)

**Interfaces:**

- Consumes: `showOwner` / page layout from Task 1; alerts tab from Task 1.
- Produces: capability `'device.control.read'`; `ConnectivityEvent { id: string; event: 'online' | 'offline'; occurredAt: string; durationSeconds?: number }`; `getConnectivityHistory(deviceId, signal?)`; `deviceQueries.connectivityHistory(deviceId)`; `DeviceOverviewProps.showControlState: boolean`.

- [x] **Step 1: Capability**

In `capabilities.ts`:

- In `CAPABILITIES`, after `'device.control',` add `'device.control.read',`.
- In the matrix comment, after the `device.control` row add:
  `// device.control.read          |   ✓   |   ✓   |    ✓    |    ✓    |       |           | 3.4c (R)`
- In `ROLE_CAPABILITIES`, add `'device.control.read',` right after `'device.control',` for `admin` and `service_center`, and after `'device.export',` for `factory`. (`super_admin` holds every capability.)

In `permissionCatalog.ts`, the `device_control` row becomes:

```ts
  {
    key: 'device_control',
    module: 'devices',
    cells: { read: 'device.control.read', send: 'device.control' },
  },
```

- [x] **Step 2: Connectivity schema, API, query**

Append to `deviceDetailSchemas.ts`:

```ts
// §3.4d online/offline history. `duration_seconds` is how long the device
// stayed in that state.
export const connectivityEventDtoSchema = z.object({
  id: z.string().min(1),
  event: z.enum(['online', 'offline']),
  occurred_at: z.string().datetime({ offset: true }),
  duration_seconds: z.number().int().nonnegative().optional(),
});
export type ConnectivityEventDto = z.infer<typeof connectivityEventDtoSchema>;
export interface ConnectivityEvent {
  id: string;
  event: 'online' | 'offline';
  occurredAt: string;
  durationSeconds?: number;
}
```

In `deviceDetailApi.ts` import `connectivityEventDtoSchema` and `type ConnectivityEvent`, then append:

```ts
export async function getConnectivityHistory(
  deviceId: string,
  signal?: AbortSignal
): Promise<ConnectivityEvent[]> {
  const response = await apiClient.get<unknown>(
    devicePath(deviceId, '/connectivity-history'),
    { signal }
  );
  const parsed = connectivityEventDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map((item) => ({
    id: item.id,
    event: item.event,
    occurredAt: item.occurred_at,
    ...(item.duration_seconds !== undefined && {
      durationSeconds: item.duration_seconds,
    }),
  }));
}
```

In `deviceQueries.ts` import `getConnectivityHistory` and add after `alertHistory`:

```ts
  connectivityHistory: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'connectivity', deviceId] as const,
      queryFn: ({ signal }) => getConnectivityHistory(deviceId, signal),
    }),
```

- [x] **Step 3: Mock connectivity history**

In `deviceDetailFixtures.ts` add `ConnectivityEventDto` to the type import and append:

```ts
// Newest first, alternating offline/online, spaced 2–11 hours apart.
export function buildConnectivityHistory(
  deviceId: string
): ConnectivityEventDto[] {
  const seed = seedFrom(deviceId);
  const now = Date.now();
  let offsetMs = 0;
  return Array.from({ length: 20 }, (_, i) => {
    offsetMs += (2 + ((seed + i) % 10)) * 3_600_000;
    return {
      id: `${deviceId}-conn-${i}`,
      event: i % 2 === 0 ? 'offline' : 'online',
      occurred_at: new Date(now - offsetMs).toISOString(),
      duration_seconds: 60 * (5 + ((seed * (i + 1)) % 180)),
    };
  });
}
```

In `handlers.ts` add `buildConnectivityHistory` to the `./fixtures/deviceDetailFixtures` import and add next to `/ota-history`:

```ts
  http.get('/api/devices/:deviceId/connectivity-history', ({ params }) => {
    if (!allowed('device.history.read')) return deviceError('forbidden', 403);
    return HttpResponse.json(buildConnectivityHistory(String(params.deviceId)));
  }),
```

- [x] **Step 4: Lock is a control command in the mock**

In `mutateDevice` replace:

```ts
  const lifecycleActions = ['delete', 'set_lifecycle_state', 'restore'];
  const capability = lifecycleActions.includes(action)
    ? 'device.lifecycle'
    : 'device.edit_info';
```

with:

```ts
  // §3.4c: lock/unlock is a control command; restore/delete stay lifecycle.
  const capability: Capability =
    action === 'set_lifecycle_state'
      ? 'device.control'
      : action === 'delete' || action === 'restore'
        ? 'device.lifecycle'
        : 'device.edit_info';
```

and in the `set_lifecycle_state` branch, right after the `parsed.success` check, add:

```ts
    if (
      parsed.data.lifecycle_state === 'decommissioned' &&
      !allowed('device.lifecycle')
    )
      return deviceError('forbidden', 403);
```

- [x] **Step 5: Lock/unlock button**

In `DeviceLifecycleActions.tsx` replace the returned JSX with:

```tsx
  return (
    <>
      <PermissionGuard capability="device.control">
        {device.lifecycleState === 'active' ? (
          <Button size="small" onClick={() => setPendingAction('locked')}>
            {t('lifecycleActions.lock')}
          </Button>
        ) : device.lifecycleState === 'locked' ? (
          <Button size="small" onClick={() => setPendingAction('active')}>
            {t('lifecycleActions.unlock')}
          </Button>
        ) : null}
      </PermissionGuard>
      <PermissionGuard capability="device.lifecycle">
        {canRestore ? (
          <Button size="small" onClick={() => setPendingAction('restore')}>
            {t('lifecycleActions.restore')}
          </Button>
        ) : null}
      </PermissionGuard>

      <Modal
        title={
          pendingAction
            ? t(`lifecycleActions.confirmTitle.${pendingAction}`)
            : ''
        }
        open={pendingAction !== null}
        onCancel={() => {
          setPendingAction(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okText={t('lifecycleActions.confirm')}
        cancelText={t('lifecycleActions.cancel')}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => mutation.mutate(values)}
        >
          <Form.Item
            name="reason"
            label={t('lifecycleActions.reason')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('validation.required'),
              },
            ]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
```

The modal only opens from the guarded buttons, so it needs no guard of its own.

- [x] **Step 6: Control state badges**

In `DeviceOverview.tsx` add to `DeviceOverviewProps`:

```ts
  /** §3.4c (R): read-only power and lock state, e.g. for the factory role. */
  showControlState: boolean;
```

destructure `showControlState`, and right after the `lifecycleState` badge block (`{device.lifecycleState !== 'active' ? (…) : null}`) insert:

```tsx
            {showControlState ? (
              <div className="flex flex-wrap items-center gap-2">
                <PortalBadge tone={device.powered ? 'primary' : 'danger'} dot>
                  {t(
                    device.powered ? 'controlState.powerOn' : 'controlState.powerOff'
                  )}
                </PortalBadge>
                {device.lifecycleState !== 'decommissioned' ? (
                  <PortalBadge
                    tone={
                      device.lifecycleState === 'locked' ? 'warning' : 'primary'
                    }
                    dot
                  >
                    {t(
                      device.lifecycleState === 'locked'
                        ? 'controlState.locked'
                        : 'controlState.unlocked'
                    )}
                  </PortalBadge>
                ) : null}
              </div>
            ) : null}
```

In `DeviceDetailPage.tsx` add next to `canSeeHistory`:

```ts
  const canSeeControlState = Boolean(
    session && hasCapability(session.role, 'device.control.read')
  );
```

and pass `showControlState={canSeeControlState}` to `DeviceOverview`.

- [x] **Step 7: i18n**

Add a top-level `controlState` object — vi:

```json
  "controlState": {
    "powerOn": "Nguồn: Đang bật",
    "powerOff": "Nguồn: Đang tắt",
    "locked": "Khóa: Đang khóa",
    "unlocked": "Khóa: Hoạt động"
  },
```

en:

```json
  "controlState": {
    "powerOn": "Power: On",
    "powerOff": "Power: Off",
    "locked": "Lock: Locked",
    "unlocked": "Lock: Active"
  },
```

Replace the `history` object — vi:

```json
  "history": {
    "title": "Lịch sử thiết bị",
    "module": "Module",
    "mainboard": "Mainboard",
    "tabs": {
      "connectivity": "Online/Offline",
      "ota": "OTA",
      "service": "Bảo hành & bảo trì",
      "alerts": "Cảnh báo",
      "filterChanges": "Thay lõi"
    },
    "export": "Xuất CSV",
    "loadError": "Không thể tải lịch sử này.",
    "connectivityEmpty": "Chưa có lịch sử kết nối.",
    "alertsEmpty": "Chưa có cảnh báo nào trên thiết bị này.",
    "filterChangesEmpty": "Chưa có lịch sử thay lõi.",
    "otaEmpty": "Chưa có lịch sử cập nhật firmware.",
    "serviceEmpty": "Chưa có lịch sử bảo hành hoặc bảo trì.",
    "connectivity": { "online": "Kết nối lại", "offline": "Mất kết nối" },
    "duration": "Kéo dài {{hours}} giờ {{minutes}} phút",
    "alertStatus": {
      "open": "Đang mở",
      "assigned": "Đã phân công",
      "in_progress": "Đang xử lý",
      "closed": "Đã đóng"
    },
    "filterPosition": "Vị trí {{position}} · {{name}}",
    "channel": { "app": "Qua App", "technician": "Kỹ thuật viên" },
    "otaResult": {
      "success": "Thành công",
      "failed": "Thất bại",
      "rolled_back": "Đã quay lại bản cũ"
    },
    "serviceType": { "warranty": "Bảo hành", "maintenance": "Bảo trì" },
    "serviceStatus": {
      "scheduled": "Đã lên lịch",
      "in_progress": "Đang xử lý",
      "done": "Hoàn tất"
    },
    "csv": {
      "time": "Thời điểm",
      "event": "Sự kiện",
      "durationMinutes": "Thời lượng (phút)",
      "track": "Loại firmware",
      "fromVersion": "Từ phiên bản",
      "toVersion": "Lên phiên bản",
      "result": "Kết quả",
      "completedAt": "Hoàn tất lúc",
      "ticket": "Mã phiếu",
      "type": "Loại",
      "summary": "Nội dung",
      "status": "Trạng thái",
      "code": "Mã lỗi",
      "title": "Tiêu đề",
      "severity": "Mức độ",
      "closedAt": "Đóng lúc",
      "position": "Vị trí",
      "core": "Lõi",
      "oldSerial": "Serial cũ",
      "newSerial": "Serial mới",
      "channel": "Kênh"
    }
  },
```

en:

```json
  "history": {
    "title": "Device history",
    "module": "Module",
    "mainboard": "Mainboard",
    "tabs": {
      "connectivity": "Online/Offline",
      "ota": "OTA",
      "service": "Warranty & maintenance",
      "alerts": "Alerts",
      "filterChanges": "Filter changes"
    },
    "export": "Export CSV",
    "loadError": "Could not load this history.",
    "connectivityEmpty": "No connectivity history yet.",
    "alertsEmpty": "No alerts on this device yet.",
    "filterChangesEmpty": "No filter replacement history yet.",
    "otaEmpty": "No firmware update history yet.",
    "serviceEmpty": "No warranty or maintenance history yet.",
    "connectivity": { "online": "Reconnected", "offline": "Disconnected" },
    "duration": "Lasted {{hours}} h {{minutes}} min",
    "alertStatus": {
      "open": "Open",
      "assigned": "Assigned",
      "in_progress": "In progress",
      "closed": "Closed"
    },
    "filterPosition": "Position {{position}} · {{name}}",
    "channel": { "app": "Via app", "technician": "Technician" },
    "otaResult": {
      "success": "Success",
      "failed": "Failed",
      "rolled_back": "Rolled back"
    },
    "serviceType": { "warranty": "Warranty", "maintenance": "Maintenance" },
    "serviceStatus": {
      "scheduled": "Scheduled",
      "in_progress": "In progress",
      "done": "Done"
    },
    "csv": {
      "time": "Time",
      "event": "Event",
      "durationMinutes": "Duration (min)",
      "track": "Firmware track",
      "fromVersion": "From version",
      "toVersion": "To version",
      "result": "Result",
      "completedAt": "Completed at",
      "ticket": "Ticket",
      "type": "Type",
      "summary": "Summary",
      "status": "Status",
      "code": "Error code",
      "title": "Title",
      "severity": "Severity",
      "closedAt": "Closed at",
      "position": "Position",
      "core": "Core",
      "oldSerial": "Old serial",
      "newSerial": "New serial",
      "channel": "Channel"
    }
  },
```

- [x] **Step 8: Rewrite `DeviceHistoryPanel`**

Replace the whole file with:

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Button, Tabs, Tag, Timeline } from 'antd';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalCard } from '@/shared/components/portal';
import type { PortalTone } from '@/shared/components/portal';
import { downloadCsv, type CsvColumn } from '@/shared/lib/csv';
import { formatDateTimeInLocale as formatDateTime } from '@/shared/lib/format';
import { referenceColors, softTones } from '@/theme/tokens';

import { deviceQueries } from '../queries/deviceQueries';
import type { Device } from '../schemas/deviceSchemas';
import type {
  AlertHistoryEntry,
  ConnectivityEvent,
  FilterChangeEntry,
  OtaHistoryEntry,
  ServiceHistoryEntry,
} from '../schemas/deviceDetailSchemas';

type HistoryTab = 'connectivity' | 'ota' | 'service' | 'alerts' | 'filterChanges';

const severityTone: Record<AlertHistoryEntry['severity'], PortalTone> = {
  P1: 'danger',
  P2: 'warning',
  P3: 'info',
  P4: 'warning',
};

function Empty({ text }: { text: string }) {
  return <p className="m-0 py-6 text-center text-sm text-[#636466]">{text}</p>;
}

// Each tab owns its request, so one slow or failing history never blocks
// the others.
function TabBody<T>({
  query,
  empty,
  error,
  children,
}: {
  query: UseQueryResult<T[]>;
  empty: string;
  error: string;
  children: (rows: T[]) => ReactNode;
}) {
  if (query.isError) return <Empty text={error} />;
  if (!query.data?.length)
    return query.isPending ? <Empty text="…" /> : <Empty text={empty} />;
  return <>{children(query.data)}</>;
}

// §3.4d — online/offline, OTA, warranty/maintenance, alerts and filter
// changes. Gated by device.history.read in DeviceDetailPage; export needs
// device.history.export and never includes technician or owner names.
export function DeviceHistoryPanel({ device }: { device: Device }) {
  const { t, i18n } = useTranslation('devices');
  const locale = i18n.resolvedLanguage;
  const [activeTab, setActiveTab] = useState<HistoryTab>('connectivity');

  const connectivity = useQuery(deviceQueries.connectivityHistory(device.id));
  const ota = useQuery(deviceQueries.otaHistory(device.id));
  const service = useQuery(deviceQueries.serviceHistory(device.id));
  const alerts = useQuery(deviceQueries.alertHistory(device.id));
  const filterChanges = useQuery(deviceQueries.filterChangeHistory(device.id));

  const time = (value?: string) => (value ? formatDateTime(value, locale) : '');
  const duration = (seconds?: number) =>
    seconds === undefined
      ? ''
      : t('history.duration', {
          hours: Math.floor(seconds / 3600),
          minutes: Math.floor((seconds % 3600) / 60),
        });

  const exportTab = () => {
    const prefix = `device-${device.id}-${activeTab}`;
    const header = (key: string) => t('history.csv.' + key);
    if (activeTab === 'connectivity') {
      const columns: CsvColumn<ConnectivityEvent>[] = [
        { header: header('time'), value: (row) => time(row.occurredAt) },
        {
          header: header('event'),
          value: (row) => t('history.connectivity.' + row.event),
        },
        {
          header: header('durationMinutes'),
          value: (row) =>
            row.durationSeconds === undefined
              ? ''
              : String(Math.round(row.durationSeconds / 60)),
        },
      ];
      downloadCsv(connectivity.data ?? [], columns, prefix);
    } else if (activeTab === 'ota') {
      const columns: CsvColumn<OtaHistoryEntry>[] = [
        { header: header('time'), value: (row) => time(row.startedAt) },
        { header: header('track'), value: (row) => t('history.' + row.track) },
        { header: header('fromVersion'), value: (row) => row.fromVersion },
        { header: header('toVersion'), value: (row) => row.toVersion },
        {
          header: header('result'),
          value: (row) => t('history.otaResult.' + row.result),
        },
        { header: header('completedAt'), value: (row) => time(row.completedAt) },
      ];
      downloadCsv(ota.data ?? [], columns, prefix);
    } else if (activeTab === 'service') {
      const columns: CsvColumn<ServiceHistoryEntry>[] = [
        { header: header('time'), value: (row) => time(row.scheduledAt) },
        { header: header('ticket'), value: (row) => row.ticketId },
        {
          header: header('type'),
          value: (row) => t('history.serviceType.' + row.type),
        },
        { header: header('summary'), value: (row) => row.summary },
        {
          header: header('status'),
          value: (row) => t('history.serviceStatus.' + row.status),
        },
        { header: header('completedAt'), value: (row) => time(row.completedAt) },
      ];
      downloadCsv(service.data ?? [], columns, prefix);
    } else if (activeTab === 'alerts') {
      const columns: CsvColumn<AlertHistoryEntry>[] = [
        { header: header('time'), value: (row) => time(row.occurredAt) },
        { header: header('code'), value: (row) => row.code },
        { header: header('title'), value: (row) => row.title },
        { header: header('severity'), value: (row) => row.severity },
        {
          header: header('status'),
          value: (row) => t('history.alertStatus.' + row.status),
        },
        { header: header('closedAt'), value: (row) => time(row.closedAt) },
      ];
      downloadCsv(alerts.data ?? [], columns, prefix);
    } else {
      const columns: CsvColumn<FilterChangeEntry>[] = [
        { header: header('time'), value: (row) => time(row.changedAt) },
        { header: header('position'), value: (row) => row.position },
        { header: header('core'), value: (row) => row.coreName },
        { header: header('oldSerial'), value: (row) => row.oldSerial ?? '' },
        { header: header('newSerial'), value: (row) => row.newSerial },
        {
          header: header('channel'),
          value: (row) => t('history.channel.' + row.channel),
        },
      ];
      downloadCsv(filterChanges.data ?? [], columns, prefix);
    }
  };

  const activeRows = {
    connectivity: connectivity.data,
    ota: ota.data,
    service: service.data,
    alerts: alerts.data,
    filterChanges: filterChanges.data,
  }[activeTab];

  const loadError = t('history.loadError');

  return (
    <PortalCard title={t('history.title')}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as HistoryTab)}
        tabBarExtraContent={
          <PermissionGuard capability="device.history.export">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              disabled={!activeRows?.length}
              onClick={exportTab}
            >
              {t('history.export')}
            </Button>
          </PermissionGuard>
        }
        items={[
          {
            key: 'connectivity',
            label: t('history.tabs.connectivity'),
            children: (
              <TabBody
                query={connectivity}
                empty={t('history.connectivityEmpty')}
                error={loadError}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color: entry.event === 'online' ? '#16A34A' : '#B42318',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {t('history.connectivity.' + entry.event)}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {time(entry.occurredAt)}
                            {entry.durationSeconds !== undefined
                              ? ` · ${duration(entry.durationSeconds)}`
                              : ''}
                          </p>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
          {
            key: 'ota',
            label: t('history.tabs.ota'),
            children: (
              <TabBody query={ota} empty={t('history.otaEmpty')} error={loadError}>
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color:
                        entry.result === 'success'
                          ? '#16A34A'
                          : entry.result === 'rolled_back'
                            ? '#F16522'
                            : '#B42318',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {t('history.' + entry.track)} · {entry.fromVersion}{' '}
                            → {entry.toVersion}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {time(entry.startedAt)}
                          </p>
                          <Tag className="mt-1">
                            {t('history.otaResult.' + entry.result)}
                          </Tag>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
          {
            key: 'service',
            label: t('history.tabs.service'),
            children: (
              <TabBody
                query={service}
                empty={t('history.serviceEmpty')}
                error={loadError}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color: '#087344',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {entry.ticketId} · {entry.summary}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {t('history.serviceType.' + entry.type)} ·{' '}
                            {time(entry.scheduledAt)}
                            {entry.technician ? ` · ${entry.technician}` : ''}
                          </p>
                          <Tag className="mt-1">
                            {t('history.serviceStatus.' + entry.status)}
                          </Tag>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
          {
            key: 'alerts',
            label: t('history.tabs.alerts'),
            children: (
              <TabBody
                query={alerts}
                empty={t('history.alertsEmpty')}
                error={loadError}
              >
                {(rows) => (
                  <ul className="m-0 list-none space-y-3 p-0">
                    {rows.map((entry) => {
                      const tone = severityTone[entry.severity];
                      return (
                        <li
                          key={entry.id}
                          className="flex items-center gap-3 rounded-xl border border-[#E7E8E9] p-3"
                        >
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: softTones[tone],
                              color: referenceColors[tone],
                            }}
                          >
                            <WarningOutlined />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-semibold text-[#020204]">
                              {entry.title}
                            </p>
                            <p className="m-0 mt-0.5 font-mono text-xs text-[#636466]">
                              {entry.severity}-{entry.code} ·{' '}
                              {time(entry.occurredAt)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#636466]">
                            {t('history.alertStatus.' + entry.status)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabBody>
            ),
          },
          {
            key: 'filterChanges',
            label: t('history.tabs.filterChanges'),
            children: (
              <TabBody
                query={filterChanges}
                empty={t('history.filterChangesEmpty')}
                error={loadError}
              >
                {(rows) => (
                  <Timeline
                    items={rows.map((entry) => ({
                      color: '#F16522',
                      children: (
                        <div>
                          <p className="m-0 text-sm font-semibold">
                            {t('history.filterPosition', {
                              position: entry.position,
                              name: entry.coreName,
                            })}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-[#636466]">
                            {time(entry.changedAt)} ·{' '}
                            {t('history.channel.' + entry.channel)}
                          </p>
                          <p className="mb-0 mt-1 font-mono text-xs text-[#636466]">
                            {entry.oldSerial ? `${entry.oldSerial} → ` : ''}
                            {entry.newSerial}
                          </p>
                        </div>
                      ),
                    }))}
                  />
                )}
              </TabBody>
            ),
          },
        ]}
      />
    </PortalCard>
  );
}
```

- [x] **Step 9: Check**

Run (PowerShell): `pnpm typecheck; if ($?) { pnpm lint }`
Expected: both exit 0.

- [ ] **Step 10: Manual MSW check**

On `/devices/KGR-0002` (no active OTA):

- `admin`: badges "Nguồn: Đang bật" and "Khóa: Hoạt động"; a "Khóa" button. Lock with a reason → badge "Khóa: Đang khóa", button becomes "Mở khóa", operation log gains "Đổi trạng thái". History has 5 tabs in the order Online/Offline, OTA, Bảo hành & bảo trì, Cảnh báo, Thay lõi. "Xuất CSV" downloads `device-KGR-0002-connectivity-<date>.csv` that opens in Excel with Vietnamese intact; the service CSV has no technician column.
- `service_center`: "Khóa" visible; history visible; no "Xuất CSV".
- `factory`: both badges visible, no "Khóa" button, no control dropdown; history with "Xuất CSV".
- `sales`, `logistics`: no badges, no history.
- System → role groups matrix: the "Điều khiển từ xa" row shows an R cell for Super Admin, Admin, Nhà máy, TT DV.

- [x] **Step 11: Commit**

```bash
git add src/core/permissions src/features/devices src/mocks
git commit -m "feat(devices): add connectivity history, history export and device lock"
```

---

### Task 6: Full verification

**Files:** none unless a check fails.

- [ ] **Step 1: Required checks**

Run (PowerShell): `pnpm lint; pnpm typecheck; pnpm format:check; pnpm build`
Expected: every command exits 0. If `format:check` fails, run `pnpm format`, review the diff, and commit it as `style: format device detail changes`.

- [ ] **Step 2: Role walkthrough**

With `pnpm dev`, reload between roles (the mock store resets on reload) and confirm the spec's role table on `/devices/KGR-0001`:

| Role                | Owner & shared | Change owner | Remove / revoke | Control badges | Lock button | History | Export |
| ------------------- | -------------- | ------------ | --------------- | -------------- | ----------- | ------- | ------ |
| super_admin / admin | ✅             | ✅           | ✅              | ✅             | ✅          | ✅      | ✅     |
| service_center      | ✅             | ✅           | —               | ✅             | ✅          | ✅      | —      |
| factory             | —              | —            | —               | ✅             | —           | ✅      | ✅     |
| sales / logistics   | —              | —            | —               | —              | —           | —       | —      |

Also confirm for `factory`: the `/api/devices/KGR-0001` response has no `shared_members`, `owner_history` or owner name, and `/api/devices/KGR-0001/owner` returns 403.

- [ ] **Step 3: Report**

Summarise the commands and their results, and list the spec assumptions still awaiting business confirmation (share permission values, core health thresholds, revoke = D, lock = control, backend notification).
