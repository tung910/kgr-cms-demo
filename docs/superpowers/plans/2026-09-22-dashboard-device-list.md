# Dashboard & Device List (CMS_QnA_V1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the existing Dashboard (`/`) and Device list (`/devices`) screens in line with `docs/CMS_QnA_V1_SPEC.md` §1 and §3.1–3.3.

**Architecture:** Both feature slices already exist; each task edits one slice layer-by-layer in the `SCREEN_WORKFLOW.md` order (permissions → schema → API → query → mock → i18n → components → route). Dashboard 1.1–1.3 keep the single `/dashboard/summary` query; 1.4 gets its own endpoint and route search state. The device list gets a server-side status-count endpoint instead of fetching the whole fleet.

**Tech Stack:** Vite, React 19, TypeScript, TanStack Router/Query, Zod, Ant Design, ECharts (`PortalEChart`), MSW, i18next.

**Spec:** `docs/superpowers/specs/2026-09-22-dashboard-device-list-design.md` (read it with this plan).

## Global Constraints

- Follow `AGENTS.md`, `docs/CODING_CONVENTIONS.md`, `docs/SCREEN_WORKFLOW.md` (skill `new-screen`).
- Two-space indent, single quotes, semicolons; Prettier + ESLint enforce.
- Capability checks only via `hasCapability` / `PermissionGuard`; never branch on role names. Missing capability → element hidden, not disabled.
- DTO = snake_case parsed with Zod at the API boundary; model = camelCase.
- Every user-visible string goes through i18n in both `vi.json` and `en.json`.
- No new dependencies. CSV export uses `src/shared/lib/csv.ts` `downloadCsv`.
- **No test framework is configured and none may be added** (AGENTS.md). Each task's check is `pnpm typecheck` + `pnpm lint`, plus a manual MSW check where noted. The final task runs the full required set.
- Do not edit `src/routeTree.gen.ts` by hand.
- Mock role switcher: MSW reads the role from `localStorage['cms-portal:mock-auth-role']` (set by the login screen in mock mode).

---

### Task 1: Dashboard export capabilities

**Files:**

- Modify: `src/core/permissions/capabilities.ts` (CAPABILITIES list, matrix comment, `ROLE_CAPABILITIES`)
- Modify: `src/core/permissions/permissionCatalog.ts` (`PERMISSION_CATALOG`)
- Modify: `src/features/system/locales/vi.json`, `src/features/system/locales/en.json` (`roles.matrix.functions`)

**Interfaces:**

- Produces: capabilities `'dashboard.tds.export'` and `'dashboard.revenue.export'`, used by Task 3.

- [ ] **Step 1: Add the capabilities**

In `CAPABILITIES`, replace the M01 block:

```ts
  // M01 dashboard: 1.1–1.3 are open to every role, only 1.4 is gated.
  'dashboard.active.read',
  'dashboard.active.export',
```

with:

```ts
  // M01 dashboard: 1.1–1.3 are open to every role, only 1.4 is gated.
  // 1.3 export is split by content: TDS (factory) vs filter revenue (sales).
  'dashboard.tds.export',
  'dashboard.revenue.export',
  'dashboard.active.read',
  'dashboard.active.export',
```

- [ ] **Step 2: Update the matrix comment**

Insert above the `// dashboard.active.read` row:

```ts
// dashboard.tds.export         |   ✓   |   ✓   |    ✓    |         |   ✓   |           | 1.3
// dashboard.revenue.export     |   ✓   |   ✓   |         |         |   ✓   |           | 1.3 note
```

- [ ] **Step 3: Grant them in `ROLE_CAPABILITIES`**

`super_admin` already gets every capability. Add at the top of each list:

- `admin`: `'dashboard.tds.export', 'dashboard.revenue.export',`
- `sales`: `'dashboard.tds.export', 'dashboard.revenue.export',`
- `factory`: `'dashboard.tds.export',`
- `service_center`, `logistics`: nothing.

- [ ] **Step 4: Expose them in the role-group matrix**

In `PERMISSION_CATALOG`, insert before the `dashboard_active` entry:

```ts
  {
    key: 'dashboard_tds',
    module: 'dashboard',
    cells: { export: 'dashboard.tds.export' },
  },
  {
    key: 'dashboard_revenue',
    module: 'dashboard',
    cells: { export: 'dashboard.revenue.export' },
  },
```

In `src/features/system/locales/vi.json` under `roles.matrix.functions`, before `"dashboard_active"`:

```json
        "dashboard_tds": "Biểu đồ TDS theo khu vực",
        "dashboard_revenue": "Biểu đồ doanh thu lõi",
```

In `en.json`, same place:

```json
        "dashboard_tds": "TDS by region chart",
        "dashboard_revenue": "Filter revenue chart",
```

- [ ] **Step 5: Check**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/permissions src/features/system/locales
git commit -m "feat(permissions): split dashboard 1.3 export into tds and revenue"
```

---

### Task 2: Dashboard 1.1–1.2 contract cleanup and online/offline chart

Removes the out-of-spec alert panel and role banner, switches 1.2 to Online/Offline, colours TDS over the threshold red, and lays out the page per spec.

**Files:**

- Modify: `src/features/dashboard/schemas/dashboardSchemas.ts`
- Modify: `src/features/dashboard/api/dashboardMapper.ts`
- Modify: `src/mocks/fixtures/dashboard.ts`
- Modify: `src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `src/features/dashboard/locales/vi.json`, `en.json`
- Delete: `src/features/dashboard/components/ActiveAlertsPanel.tsx`, `src/features/dashboard/components/RoleScopeBanner.tsx`

**Interfaces:**

- Produces: `DashboardTrendPoint { label: string; online: number; offline: number }`; `DashboardSummary` without `alerts`.

- [ ] **Step 1: Update the schema**

In `dashboardSchemas.ts`:

- Delete `DashboardAlertSeverity`, `DashboardAlert`, `alertDtoSchema`, `DashboardAlertDto`.
- Change `DashboardTrendPoint` to:

```ts
export interface DashboardTrendPoint {
  label: string;
  online: number;
  offline: number;
}
```

- Remove `alerts: DashboardAlert[];` from `DashboardSummary`.
- Change `trendPointDtoSchema` to:

```ts
const trendPointDtoSchema = z.object({
  label: z.string().min(1),
  online: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(),
});
```

- Remove `alerts: z.array(alertDtoSchema),` from `dashboardSummaryDtoSchema`.

- [ ] **Step 2: Update the mapper**

In `dashboardMapper.ts`, delete `mapAlert`, the `DashboardAlert`/`DashboardAlertDto` imports, and the `alerts:` line in `mapDashboardSummary`.

- [ ] **Step 3: Update the fixture**

In `src/mocks/fixtures/dashboard.ts`, replace `online_trend: [...]` with 24 hourly points, and delete the whole `alerts: [...]` array:

```ts
  online_trend: Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}h`,
    online: 17_900 + ((hour * 137) % 600),
    offline: 380 + ((hour * 53) % 160),
  })),
```

- [ ] **Step 4: Update the page**

In `DashboardPage.tsx`:

- Remove imports: `useAuth`, `hasMenuAccess`, `ActiveAlertsPanel`, `RoleScopeBanner`; remove `canAccessAlerts` and `const { session } = useAuth();`.
- In `useOnlineTrendOption`, add `tooltip: { trigger: 'axis' },` as the first key, and replace the second series (`legend.active`, info colour) with:

```ts
        {
          name: t('legend.offline'),
          type: 'line',
          data: points.map((point) => point.offline),
          smooth: 0.35,
          symbol: 'none',
          lineStyle: { color: '#636466', width: 2.5 },
        },
```

- In `useTdsByRegionOption`, add `tooltip: { trigger: 'axis' },` and change `referenceColors.warning` to `referenceColors.danger`.
- In `useRevenueOption`, add `tooltip: { trigger: 'axis' },`.
- Replace the JSX after the metric grid (both chart grids, the `RoleScopeBanner` line and the `ActiveAlertsPanel`) with:

```tsx
      <PortalChart
        title={t('charts.onlineTrend.title')}
        description={t('charts.onlineTrend.description')}
      >
        <PortalEChart
          option={onlineTrendOption}
          ariaLabel={t('charts.onlineTrend.ariaLabel')}
        />
      </PortalChart>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PortalChart
          title={t('charts.tds.title')}
          description={t('charts.tds.description', {
            threshold: data?.tdsThreshold ?? 0,
          })}
        >
          <PortalEChart option={tdsOption} ariaLabel={t('charts.tds.title')} />
        </PortalChart>
        <PortalChart
          title={t('charts.revenue.title')}
          description={t('charts.revenue.description')}
        >
          <PortalEChart
            option={revenueOption}
            ariaLabel={t('charts.revenue.ariaLabel')}
          />
        </PortalChart>
      </div>
```

- [ ] **Step 5: Delete the two components**

```bash
git rm src/features/dashboard/components/ActiveAlertsPanel.tsx src/features/dashboard/components/RoleScopeBanner.tsx
```

- [ ] **Step 6: Update locales**

In both `dashboard/locales/*.json`: delete `roleScope`, `scopes`, `alertsPanel`, `severity`, `page.previewTag`, `legend.active`, `charts.onlineTrend.tooltip`, `charts.revenue.tooltip`. Then set:

`vi.json`:

```json
    "onlineTrend": {
      "title": "Thiết bị online/offline (24h)",
      "description": "Số thiết bị Online và Offline theo giờ",
      "ariaLabel": "Số thiết bị online và offline theo từng giờ trong 24 giờ qua."
    },
```

and `"legend": { "online": "Online", "offline": "Offline", "revenue": "Doanh thu", "filters": "Số lõi" }`.

`en.json`:

```json
    "onlineTrend": {
      "title": "Online/offline devices (24h)",
      "description": "Online and offline devices by hour",
      "ariaLabel": "Online and offline device counts for each hour of the last 24 hours."
    },
```

and `"legend": { "online": "Online", "offline": "Offline", "revenue": "Revenue", "filters": "Filters" }`.

- [ ] **Step 7: Check**

Run: `pnpm typecheck && pnpm lint && rg -n "ActiveAlertsPanel|RoleScopeBanner|legend.active" src`
Expected: typecheck and lint pass; `rg` prints nothing.

- [ ] **Step 8: Commit**

```bash
git add -A src/features/dashboard src/mocks/fixtures/dashboard.ts
git commit -m "feat(dashboard): show online/offline by hour and drop out-of-spec panels"
```

---

### Task 3: Dashboard 1.3 exports

**Files:**

- Create: `src/features/dashboard/utils/exportDashboardCsv.ts`
- Modify: `src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `src/features/dashboard/locales/vi.json`, `en.json`

**Interfaces:**

- Consumes: `dashboard.tds.export`, `dashboard.revenue.export` (Task 1); `DashboardRegionTds`, `DashboardRevenuePoint` (existing).
- Produces: `downloadTdsCsv(regions, threshold)`, `downloadRevenueCsv(points)`, `downloadActiveCsv(points, granularity)` (Task 4 uses the last one and adds its types).

- [ ] **Step 1: Create the export helpers**

`src/features/dashboard/utils/exportDashboardCsv.ts` (headers stay English, matching `devices/utils/exportDevicesToCsv.ts`):

```ts
import { downloadCsv } from '@/shared/lib/csv';

import type {
  DashboardRegionTds,
  DashboardRevenuePoint,
} from '../schemas/dashboardSchemas';

export function downloadTdsCsv(
  regions: readonly DashboardRegionTds[],
  threshold: number
): void {
  downloadCsv(
    regions,
    [
      { header: 'Region', value: (row) => row.region },
      { header: 'Average TDS (ppm)', value: (row) => String(row.tds) },
      {
        header: `Above threshold (${threshold} ppm)`,
        value: (row) => (row.tds > threshold ? 'yes' : 'no'),
      },
    ],
    'dashboard-tds'
  );
}

export function downloadRevenueCsv(
  points: readonly DashboardRevenuePoint[]
): void {
  downloadCsv(
    points,
    [
      { header: 'Month', value: (row) => row.label },
      { header: 'Revenue', value: (row) => String(row.revenue) },
      { header: 'Filters sold', value: (row) => String(row.filters) },
    ],
    'dashboard-filter-revenue'
  );
}
```

- [ ] **Step 2: Add the buttons**

In `DashboardPage.tsx` add imports:

```ts
import { DownloadOutlined } from '@ant-design/icons';
import { Alert, Button, Skeleton } from 'antd';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { downloadRevenueCsv, downloadTdsCsv } from '../utils/exportDashboardCsv';
```

(merge `DownloadOutlined` into the existing `@ant-design/icons` import and `Button` into the existing `antd` import).

Add an `actions` prop to the TDS `PortalChart`:

```tsx
          actions={
            <PermissionGuard capability="dashboard.tds.export">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                disabled={!data}
                onClick={() =>
                  data && downloadTdsCsv(data.tdsByRegion, data.tdsThreshold)
                }
              >
                {t('actions.exportExcel')}
              </Button>
            </PermissionGuard>
          }
```

and to the revenue `PortalChart`:

```tsx
          actions={
            <PermissionGuard capability="dashboard.revenue.export">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                disabled={!data}
                onClick={() => data && downloadRevenueCsv(data.revenueTrend)}
              >
                {t('actions.exportExcel')}
              </Button>
            </PermissionGuard>
          }
```

- [ ] **Step 3: Locales**

`vi.json`: add top-level `"actions": { "exportExcel": "Xuất Excel" }`.
`en.json`: add top-level `"actions": { "exportExcel": "Export to Excel" }`.

- [ ] **Step 4: Check**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual (`pnpm dev`, mock mode): sign in as Nhà máy → only the TDS card has "Xuất Excel"; as KD → both cards; as TT DV → neither. Click an export and open the CSV: Vietnamese region names show correctly.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard
git commit -m "feat(dashboard): export tds and filter revenue charts by capability"
```

---

### Task 4: Dashboard 1.4 active customers & devices

**Files:**

- Modify: `src/features/dashboard/schemas/dashboardSchemas.ts`
- Modify: `src/features/dashboard/api/dashboardApi.ts`
- Modify: `src/features/dashboard/queries/dashboardQueries.ts`
- Modify: `src/features/dashboard/utils/exportDashboardCsv.ts`
- Create: `src/features/dashboard/components/ActiveUsageSection.tsx`
- Modify: `src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `src/routes/_authenticated/index.tsx`
- Modify: `src/mocks/fixtures/dashboard.ts`, `src/mocks/handlers.ts`
- Modify: `src/features/dashboard/locales/vi.json`, `en.json`

**Interfaces:**

- Consumes: `dashboard.active.read`, `dashboard.active.export` (existing).
- Produces:
  - `ACTIVE_GRANULARITIES`, `activeGranularitySchema`, `type ActiveGranularity = 'week' | 'month' | 'year'`
  - `interface DashboardActiveFilters { granularity: ActiveGranularity; from?: string; to?: string }` (dates `YYYY-MM-DD`)
  - `interface DashboardActivePoint { label: string; customers: number; devices: number }`
  - `dashboardSearchSchema`, `type DashboardSearch`
  - `getDashboardActive(filters, signal?) => Promise<DashboardActivePoint[]>`
  - `dashboardQueries.active(filters)`
  - `downloadActiveCsv(points, granularity)`

- [ ] **Step 1: Schema**

Append to `dashboardSchemas.ts`:

```ts
// 1.4 is the only dashboard block with its own period controls.
export const ACTIVE_GRANULARITIES = ['week', 'month', 'year'] as const;
export const activeGranularitySchema = z.enum(ACTIVE_GRANULARITIES);
export type ActiveGranularity = z.infer<typeof activeGranularitySchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Route search for `/`; every field falls back to undefined on a bad URL.
export const dashboardSearchSchema = z.object({
  granularity: activeGranularitySchema.optional().catch(undefined),
  from: isoDateSchema.optional().catch(undefined),
  to: isoDateSchema.optional().catch(undefined),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

export interface DashboardActiveFilters {
  granularity: ActiveGranularity;
  from?: string;
  to?: string;
}

export interface DashboardActivePoint {
  label: string;
  customers: number;
  devices: number;
}

export const dashboardActiveDtoSchema = z.object({
  granularity: activeGranularitySchema,
  points: z.array(
    z.object({
      label: z.string().min(1),
      customers: z.number().int().nonnegative(),
      devices: z.number().int().nonnegative(),
    })
  ),
});
export type DashboardActiveDto = z.infer<typeof dashboardActiveDtoSchema>;
```

- [ ] **Step 2: API**

Append to `dashboardApi.ts` (and add `dashboardActiveDtoSchema`, `type DashboardActiveFilters`, `type DashboardActivePoint` to the schema import). The DTO points are already camelCase-compatible, so no mapper:

```ts
export async function getDashboardActive(
  filters: DashboardActiveFilters,
  signal?: AbortSignal
): Promise<DashboardActivePoint[]> {
  const params = new URLSearchParams({ granularity: filters.granularity });
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const response = await apiClient.get<unknown>(
    `/dashboard/active?${params.toString()}`,
    { signal }
  );
  const parsed = dashboardActiveDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.points;
}
```

- [ ] **Step 3: Query**

Replace `dashboardQueries.ts` with:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { getDashboardActive, getDashboardSummary } from '../api/dashboardApi';
import type { DashboardActiveFilters } from '../schemas/dashboardSchemas';

export const dashboardQueries = {
  all: ['dashboard'] as const,
  summary: () =>
    queryOptions({
      queryKey: [...dashboardQueries.all, 'summary'] as const,
      // Header shows a "live" badge — keep the KPIs reasonably fresh.
      refetchInterval: 30_000,
      queryFn: ({ signal }) => getDashboardSummary(signal),
    }),
  active: (filters: DashboardActiveFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all, 'active', filters] as const,
      queryFn: ({ signal }) => getDashboardActive(filters, signal),
      // Keep the old bars on screen while a new period loads.
      placeholderData: keepPreviousData,
    }),
};
```

- [ ] **Step 4: Export helper**

Append to `exportDashboardCsv.ts` (and add `ActiveGranularity`, `DashboardActivePoint` to its type import):

```ts
export function downloadActiveCsv(
  points: readonly DashboardActivePoint[],
  granularity: ActiveGranularity
): void {
  downloadCsv(
    points,
    [
      { header: 'Period', value: (row) => row.label },
      { header: 'Active customers', value: (row) => String(row.customers) },
      { header: 'Active devices', value: (row) => String(row.devices) },
    ],
    `dashboard-active-${granularity}`
  );
}
```

- [ ] **Step 5: Mock fixture and handler**

Append to `src/mocks/fixtures/dashboard.ts` (and change its import to `import type { DashboardActiveDto, DashboardSummaryDto } from ...`):

```ts
// ponytail: the mock ignores from/to and always returns the latest periods;
// the backend applies the range.
const activeLabels: Record<DashboardActiveDto['granularity'], string[]> = {
  week: Array.from({ length: 12 }, (_, index) => `W${index + 27}`),
  month: Array.from({ length: 12 }, (_, index) => {
    const month = ((index + 9) % 12) + 1;
    const year = index < 3 ? 25 : 26;
    return `T${month}/${year}`;
  }),
  year: ['2022', '2023', '2024', '2025', '2026'],
};
const activeScale: Record<DashboardActiveDto['granularity'], number> = {
  week: 1,
  month: 4,
  year: 40,
};

export function buildDashboardActiveFixture(
  granularity: DashboardActiveDto['granularity']
): DashboardActiveDto {
  const scale = activeScale[granularity];
  return {
    granularity,
    points: activeLabels[granularity].map((label, index) => ({
      label,
      customers: Math.round((2_400 + index * 120 + (index % 3) * 90) * scale),
      devices: Math.round((3_100 + index * 150 + (index % 4) * 70) * scale),
    })),
  };
}
```

In `src/mocks/handlers.ts`: change the fixture import to `import { buildDashboardActiveFixture, dashboardSummaryFixture } from './fixtures/dashboard';`, then add right after the `/api/dashboard/summary` handler:

```ts
  http.get('/api/dashboard/active', ({ request }) => {
    if (!allowed('dashboard.active.read')) return deviceError('forbidden', 403);
    const url = new URL(request.url);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: 'Mock dashboard server error.' },
        { status: 500 }
      );
    }
    const granularity = url.searchParams.get('granularity');
    return HttpResponse.json(
      buildDashboardActiveFixture(
        granularity === 'week' || granularity === 'year' ? granularity : 'month'
      )
    );
  }),
```

- [ ] **Step 6: Section component**

Create `src/features/dashboard/components/ActiveUsageSection.tsx`:

```tsx
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, DatePicker, Segmented } from 'antd';
import dayjs from 'dayjs';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalChart, PortalEChart } from '@/shared/components/portal';
import { referenceColors } from '@/theme/tokens';

import { dashboardQueries } from '../queries/dashboardQueries';
import {
  ACTIVE_GRANULARITIES,
  type ActiveGranularity,
  type DashboardActiveFilters,
  type DashboardActivePoint,
} from '../schemas/dashboardSchemas';
import { downloadActiveCsv } from '../utils/exportDashboardCsv';

const isoDateFormat = 'YYYY-MM-DD';
const emptyPoints: DashboardActivePoint[] = [];

function useActiveBarOption(
  points: readonly DashboardActivePoint[],
  key: 'customers' | 'devices',
  color: string
): EChartsOption {
  return useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: points.map((point) => point.label),
        axisLine: { lineStyle: { color: referenceColors.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: referenceColors.border, type: 'dashed' },
        },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 28,
          itemStyle: { color, borderRadius: [6, 6, 0, 0] },
          data: points.map((point) => point[key]),
        },
      ],
    }),
    [points, key, color]
  );
}

export interface ActiveUsageSectionProps {
  filters: DashboardActiveFilters;
}

export function ActiveUsageSection({ filters }: ActiveUsageSectionProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate({ from: '/' });
  const active = useQuery(dashboardQueries.active(filters));
  const points = active.data ?? emptyPoints;
  const customersOption = useActiveBarOption(
    points,
    'customers',
    referenceColors.info
  );
  const devicesOption = useActiveBarOption(
    points,
    'devices',
    referenceColors.primary
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold">{t('active.title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<ActiveGranularity>
            aria-label={t('active.granularityAriaLabel')}
            value={filters.granularity}
            options={ACTIVE_GRANULARITIES.map((value) => ({
              value,
              label: t(`active.granularity.${value}`),
            }))}
            // A new granularity changes the picker type, so drop the range.
            onChange={(granularity) => void navigate({ search: { granularity } })}
          />
          <DatePicker.RangePicker
            picker={filters.granularity}
            aria-label={t('active.rangeAriaLabel')}
            value={
              filters.from && filters.to
                ? [dayjs(filters.from), dayjs(filters.to)]
                : null
            }
            onChange={(dates) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  from: dates?.[0]?.format(isoDateFormat),
                  to: dates?.[1]?.format(isoDateFormat),
                }),
              })
            }
          />
          <PermissionGuard capability="dashboard.active.export">
            <Button
              icon={<DownloadOutlined />}
              disabled={points.length === 0}
              onClick={() => downloadActiveCsv(points, filters.granularity)}
            >
              {t('actions.exportFile')}
            </Button>
          </PermissionGuard>
        </div>
      </div>
      {active.isError ? (
        <Alert
          type="error"
          showIcon
          message={t('errors.activeLoadFailed')}
          description={active.error.message}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PortalChart
          title={t('active.customers.title')}
          description={t('active.customers.description')}
        >
          <PortalEChart
            option={customersOption}
            ariaLabel={t('active.customers.title')}
          />
        </PortalChart>
        <PortalChart
          title={t('active.devices.title')}
          description={t('active.devices.description')}
        >
          <PortalEChart
            option={devicesOption}
            ariaLabel={t('active.devices.title')}
          />
        </PortalChart>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Wire it into the page**

In `DashboardPage.tsx`:

```tsx
import { ActiveUsageSection } from '../components/ActiveUsageSection';
import type {
  DashboardActiveFilters,
  DashboardSearch,
  // ...existing type imports
} from '../schemas/dashboardSchemas';

export interface DashboardPageProps {
  search: DashboardSearch;
}

export function DashboardPage({ search }: DashboardPageProps) {
  // ...existing hooks
  const activeFilters: DashboardActiveFilters = {
    granularity: search.granularity ?? 'month',
    ...(search.from && { from: search.from }),
    ...(search.to && { to: search.to }),
  };
```

Render as the last child of the page wrapper. The guard hides the block, so the query never runs without the capability:

```tsx
      <PermissionGuard capability="dashboard.active.read">
        <ActiveUsageSection filters={activeFilters} />
      </PermissionGuard>
```

- [ ] **Step 8: Route**

Replace `src/routes/_authenticated/index.tsx`:

```tsx
/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { dashboardSearchSchema } from '@/features/dashboard/schemas/dashboardSchemas';

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: dashboardSearchSchema,
  component: DashboardRoute,
});

function DashboardRoute() {
  return <DashboardPage search={Route.useSearch()} />;
}
```

All search fields are optional, so the existing `navigate({ to: '/' })` calls in `AppShell.tsx` and `RoleGroupEditor.tsx` still typecheck.

- [ ] **Step 9: Locales**

`vi.json`: add `"actions.exportFile": "Xuất file"` (inside the existing `actions` object), `"errors.activeLoadFailed": "Không tải được số liệu active"` (inside `errors`), and top-level:

```json
  "active": {
    "title": "Thiết bị & khách hàng active",
    "granularityAriaLabel": "Chu kỳ thống kê",
    "rangeAriaLabel": "Khoảng thời gian",
    "granularity": { "week": "Tuần", "month": "Tháng", "year": "Năm" },
    "customers": {
      "title": "Khách hàng active",
      "description": "Số khách hàng có hoạt động trong mỗi kỳ"
    },
    "devices": {
      "title": "Thiết bị active",
      "description": "Số thiết bị có kết nối trong mỗi kỳ"
    }
  }
```

`en.json`: `"actions.exportFile": "Export file"`, `"errors.activeLoadFailed": "Couldn't load active usage"`, and:

```json
  "active": {
    "title": "Active devices & customers",
    "granularityAriaLabel": "Period",
    "rangeAriaLabel": "Date range",
    "granularity": { "week": "Week", "month": "Month", "year": "Year" },
    "customers": {
      "title": "Active customers",
      "description": "Customers with activity in each period"
    },
    "devices": {
      "title": "Active devices",
      "description": "Devices that connected in each period"
    }
  }
```

- [ ] **Step 10: Check**

Run: `pnpm typecheck && pnpm lint`
Expected: pass (`pnpm typecheck` regenerates nothing; if TanStack complains about the route tree, run `pnpm build` once to regenerate `routeTree.gen.ts`).

Manual: as Admin, switch Tuần/Tháng/Năm → URL updates `?granularity=week`, bars change, F5 keeps the state; pick a range → `from`/`to` appear in the URL. Open `/?granularity=bogus` → falls back to Tháng. As Nhà máy or Kho vận the block is absent; as TT DV the block shows with no export button.

- [ ] **Step 11: Commit**

```bash
git add src/features/dashboard src/routes/_authenticated/index.tsx src/mocks
git commit -m "feat(dashboard): add active customers and devices charts"
```

---

### Task 5: Device status-count endpoint and four stat cards

**Files:**

- Modify: `src/features/devices/schemas/deviceSchemas.ts`
- Modify: `src/features/devices/api/deviceApi.ts`
- Modify: `src/features/devices/queries/deviceQueries.ts`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/features/devices/pages/DeviceListPage.tsx`
- Modify: `src/features/devices/components/DeviceListSkeleton.tsx`
- Modify: `src/features/devices/locales/vi.json`, `en.json`

**Interfaces:**

- Produces:
  - `type DeviceCountFilters = Omit<DeviceListFilters, 'status' | 'page' | 'pageSize'>`
  - `interface DeviceStatusCounts { total: number; online: number; warning: number; offline: number }`
  - `getDeviceStatusCounts(filters: DeviceCountFilters, signal?) => Promise<DeviceStatusCounts>`
  - `deviceQueries.statusCounts(filters: DeviceListFilters)` now returns `DeviceStatusCounts`

- [ ] **Step 1: Schema**

Add to `deviceSchemas.ts` after `DeviceListFilters`:

```ts
// Status cards ignore the status filter and pagination (§3.1).
export type DeviceCountFilters = Omit<
  DeviceListFilters,
  'status' | 'page' | 'pageSize'
>;

export interface DeviceStatusCounts {
  total: number;
  online: number;
  warning: number;
  offline: number;
}
```

and after `devicePageDtoSchema`:

```ts
export const deviceStatusCountsDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  online: z.number().int().nonnegative(),
  warning: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(),
});
```

- [ ] **Step 2: API**

In `deviceApi.ts`, replace `getDeviceListPath` with a shared param builder plus the list path, and add the count call (add `deviceStatusCountsDtoSchema`, `type DeviceCountFilters`, `type DeviceStatusCounts` to the schema import):

```ts
function getDeviceFilterParams(filters: DeviceCountFilters): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  const model = filters.model?.trim();
  const region = filters.region?.trim();
  const customerId = filters.customerId?.trim();

  if (search) params.set('search', search);
  if (model) params.set('model', model);
  if (region) params.set('region', region);
  if (customerId) params.set('customer_id', customerId);
  return params;
}

function getDeviceListPath(filters: DeviceListFilters): string {
  const params = getDeviceFilterParams(filters);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 0) params.set('page', String(filters.page));
  if (filters.pageSize > 0) params.set('page_size', String(filters.pageSize));
  return `/devices?${params.toString()}`;
}

export async function getDeviceStatusCounts(
  filters: DeviceCountFilters,
  signal?: AbortSignal
): Promise<DeviceStatusCounts> {
  const query = getDeviceFilterParams(filters).toString();
  const response = await apiClient.get<unknown>(
    query ? `/devices/status-counts?${query}` : '/devices/status-counts',
    { signal }
  );
  const parsed = deviceStatusCountsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data;
}
```

(`warrantyStatus` handling disappears here; Task 6 removes it from the type.)

- [ ] **Step 3: Query**

In `deviceQueries.ts`, import `getDeviceStatusCounts`, and replace the `statusCounts` entry (including its comment and TODO) with:

```ts
  // Fleet-wide breakdown for the stat cards. The key drops status and
  // pagination so paging or switching status reuses the cached counts.
  statusCounts: (filters: DeviceListFilters) => {
    const countFilters = {
      search: filters.search,
      model: filters.model,
      region: filters.region,
      customerId: filters.customerId,
    };
    return queryOptions({
      queryKey: [...deviceQueries.all, 'status-counts', countFilters] as const,
      queryFn: ({ signal }) => getDeviceStatusCounts(countFilters, signal),
    });
  },
```

- [ ] **Step 4: Mock**

In `src/mocks/handlers.ts`, extract the list filter into a helper placed next to `matchesSearch`:

```ts
function filterDevices(url: URL, withStatus: boolean): DeviceDto[] {
  const search = url.searchParams.get('search')?.trim() ?? '';
  const status = url.searchParams.get('status');
  const model = url.searchParams.get('model')?.trim();
  const region = url.searchParams.get('region')?.trim();
  const customerId = url.searchParams.get('customer_id')?.trim();
  return deviceStore.filter(
    (device) =>
      (!search || matchesSearch(device, search)) &&
      (!withStatus || !isDeviceStatus(status) || device.status === status) &&
      (!model || device.model_name === model) &&
      (!region || device.region === region) &&
      (!customerId || device.owner?.id === customerId)
  );
}
```

In the `/api/devices` handler, replace the local `search`…`warrantyStatus` variables and the `deviceStore.filter(...)` block with `const filtered = filterDevices(url, true);` (keep `page`, `pageSize`, the slicing and the response). Delete `isWarrantyStatus` if `rg -n isWarrantyStatus src/mocks` shows no other caller.

Add this handler **before** `http.get('/api/devices/:deviceId', ...)` so `status-counts` is not captured as a device id:

```ts
  http.get('/api/devices/status-counts', ({ request }) => {
    if (!allowed('device.read')) return deviceError('forbidden', 403);
    const url = new URL(request.url);
    if (url.searchParams.has('customer_id') && !allowed('device.pii.full'))
      return deviceError('forbidden', 403);
    if (hasServerError(url)) {
      return HttpResponse.json(
        { message: i18n.t('devices:errors.server') },
        { status: 500 }
      );
    }
    const devices = filterDevices(url, false);
    const count = (status: DeviceStatus) =>
      devices.filter((device) => device.status === status).length;
    return HttpResponse.json({
      total: devices.length,
      online: count('online'),
      warning: count('warning'),
      offline: count('offline'),
    });
  }),
```

- [ ] **Step 5: Page cards**

In `DeviceListPage.tsx`: rename `statusCountItems` to `counts`; add `AppstoreOutlined` to the icon import; replace the stat grid with:

```tsx
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard
          label={t('stats.total')}
          icon={<AppstoreOutlined />}
          tone="info"
          value={counts.total}
        />
        {CONNECTION_STATUSES.map(({ value: status, labelKey }) => (
          <PortalStatCard
            key={status}
            label={t(labelKey, { ns: 'common' })}
            icon={statCardConfig[status].icon}
            tone={statCardConfig[status].tone}
            value={counts[status]}
          />
        ))}
      </div>
```

- [ ] **Step 6: Skeleton**

In `DeviceListSkeleton.tsx`: `const statCardCount = 4;` and the grid class `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`.

- [ ] **Step 7: Locales**

`devices/locales/vi.json`: top-level `"stats": { "total": "Tổng thiết bị" }`.
`en.json`: `"stats": { "total": "Total devices" }`.

- [ ] **Step 8: Check**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual: `/devices` shows 4 cards; Total = 36 with no filter; filtering by model changes all four; switching the status segment does not change the cards. DevTools Network shows one `/api/devices/status-counts` request instead of the old multi-page `/api/devices?page_size=100` loop.

- [ ] **Step 9: Commit**

```bash
git add src/features/devices src/mocks/handlers.ts
git commit -m "feat(devices): count device statuses server-side and add total card"
```

---

### Task 6: Device list filters per §3.3

**Files:**

- Modify: `src/features/devices/components/DeviceFilters.tsx`
- Modify: `src/features/devices/schemas/deviceSchemas.ts`
- Modify: `src/features/devices/api/deviceApi.ts`
- Modify: `src/features/devices/queries/deviceQueries.ts`
- Modify: `src/features/devices/pages/DeviceListPage.tsx`
- Modify: `src/routes/_authenticated/devices/index.tsx`
- Modify: `src/features/customers/components/CustomerTable.tsx`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/core/i18n/locales/vi.json`, `en.json` (`connectionStatus.warning`)
- Modify: `src/features/devices/locales/vi.json`, `en.json`

**Interfaces:**

- Produces: `DeviceListFilters { search: string; status?: DeviceStatus; model?: string; region?: string; customerId?: string; page: number; pageSize: number }` (no `warrantyStatus`). Default `pageSize` 10.

- [ ] **Step 1: Filter type**

In `deviceSchemas.ts`, delete `warrantyStatus?: DeviceWarrantyStatus;` from `DeviceListFilters` and add above `customerId`:

```ts
  // No UI control: set by the customer list's device-count link.
```

- [ ] **Step 2: API and queries**

In `deviceApi.ts`, delete `getDeviceCustomers` and remove `deviceOwnerDtoSchema` from its import. In `deviceQueries.ts`, delete the `customers` entry and the `getDeviceCustomers` import.

- [ ] **Step 3: Filters component**

Replace `DeviceFilters.tsx` with:

```tsx
import { Button, Input, Segmented, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';
import { CONNECTION_STATUSES } from '@/shared/constants/connectionStatus';

import type { DeviceListFilters, DeviceStatus } from '../schemas/deviceSchemas';

const regionOptions = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Hồ Chí Minh'].map(
  (value) => ({ value, label: value })
);

export interface DeviceFiltersProps {
  filters: DeviceListFilters;
  onChange: (changes: Partial<DeviceListFilters>) => void;
  onReset: () => void;
}

export function DeviceFilters({
  filters,
  onChange,
  onReset,
}: DeviceFiltersProps) {
  const { t } = useTranslation('devices');
  const models = useQuery(modelReferenceQueries.list());
  const modelOptions = models.data?.map((model) => ({
    value: model.code,
    label: model.code,
  }));

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E7E8E9] p-4 sm:flex sm:flex-wrap sm:items-center">
      <Input.Search
        key={filters.search}
        allowClear
        aria-label={t('filters.searchAriaLabel')}
        defaultValue={filters.search}
        placeholder={t('filters.searchPlaceholder')}
        className="w-full sm:min-w-56 sm:flex-1"
        onSearch={(search) => onChange({ search })}
      />
      <Select
        allowClear
        aria-label={t('filters.modelAriaLabel')}
        placeholder={t('filters.modelPlaceholder')}
        value={filters.model}
        options={modelOptions}
        loading={models.isFetching}
        className="w-full sm:w-40"
        onChange={(model) => onChange({ model })}
      />
      <Select
        allowClear
        aria-label={t('filters.regionAriaLabel')}
        placeholder={t('filters.regionPlaceholder')}
        value={filters.region}
        options={regionOptions}
        className="w-full sm:w-44"
        onChange={(region) => onChange({ region })}
      />
      <Segmented<DeviceStatus | 'all'>
        aria-label={t('filters.statusAriaLabel')}
        value={filters.status ?? 'all'}
        options={[
          { value: 'all', label: t('filters.statusAll') },
          ...CONNECTION_STATUSES.map(({ value, labelKey }) => ({
            value,
            label: t(labelKey, { ns: 'common' }),
          })),
        ]}
        onChange={(status) =>
          onChange({ status: status === 'all' ? undefined : status })
        }
      />
      <Button className="w-full sm:w-auto" onClick={onReset}>
        {t('filters.reset')}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Page defaults, route, customer link**

- `DeviceListPage.tsx`: `defaultFilters.pageSize` → `10`.
- `src/routes/_authenticated/devices/index.tsx`: delete the `warrantyStatus` line and the `deviceWarrantyStatusSchema` import; change the `pageSize` `.catch(20)` to `.catch(10)`.
- `src/features/customers/components/CustomerTable.tsx`: in the `/devices` link search, `pageSize: 20` → `pageSize: 10`.

- [ ] **Step 5: Mock**

In `src/mocks/handlers.ts`:

- Delete the `http.get('/api/devices/customers', ...)` handler.
- Make owner-name search PII-aware (3.2 note: only roles that see names may search by them):

```ts
function matchesSearch(device: DeviceDto, search: string): boolean {
  const needle = search.toLocaleLowerCase();
  const fields = [device.device_id, device.model_name, device.region];
  if (allowed('device.pii.full') && device.owner?.name)
    fields.push(device.owner.name);
  return fields.some((value) => value.toLocaleLowerCase().includes(needle));
}
```

(`device.owner.name` becomes optional in Task 7; the `?.name` guard already covers it.)

- [ ] **Step 6: Locales**

- `src/core/i18n/locales/vi.json`: `connectionStatus.warning` → `"Lỗi"`; `en.json` → `"Error"` (spec wording for 3.1/3.3/3.4; affects every status badge).
- `devices/locales/*.json` `filters`: delete `statusOnline`, `statusOffline`, `statusWarning`, `customerAriaLabel`, `customerPlaceholder`, `warrantyAriaLabel`, `warrantyPlaceholder`, `warrantyActive`, `warrantyExpiring`, `warrantyExpired`, `warrantyNone`. Set `searchPlaceholder`: vi `"Tìm theo serial hoặc tên chủ sở hữu"`, en `"Search by serial or owner name"`.

Before deleting each key, run `rg -n "filters\.(statusOnline|statusOffline|statusWarning|customer|warranty)" src` and confirm no other caller.

- [ ] **Step 7: Check**

Run: `pnpm typecheck && pnpm lint && rg -n "warrantyStatus" src/features/devices/components src/routes`
Expected: pass; `rg` prints nothing.

Manual: filter bar shows search, Model, Khu vực, Tất cả/Online/Lỗi/Offline, Đặt lại; default 10 rows per page. From `/customers`, click a device count → device list filtered by that customer. As Admin, searching an owner name finds the device; as KD the same search finds nothing.

- [ ] **Step 8: Commit**

```bash
git add src/features/devices src/features/customers/components/CustomerTable.tsx src/routes/_authenticated/devices/index.tsx src/mocks/handlers.ts src/core/i18n/locales
git commit -m "feat(devices): align list filters with CMS_QnA_V1 3.3"
```

---

### Task 7: Device directory columns per §3.2

**Files:**

- Modify: `src/shared/lib/format.ts`
- Modify: `src/features/devices/schemas/deviceSchemas.ts`
- Modify: `src/features/devices/api/deviceMapper.ts`
- Modify: `src/features/devices/components/DeviceTable.tsx`
- Modify: `src/features/devices/components/DeviceOverview.tsx:177`, `DeviceOwnershipPanel.tsx:36`, `DeviceDeleteDialog.tsx:97`
- Modify: `src/features/devices/utils/exportDevicesToCsv.ts`
- Modify: `src/mocks/fixtures/devices.ts`, `src/mocks/handlers.ts` (`deviceForRole`)
- Modify: `src/features/devices/locales/vi.json`, `en.json`

**Interfaces:**

- Produces: `formatRelativeTime(value: string, locale?: string, now?: number): string | null`; `Device.ward?: string`; `DeviceOwner.name?: string`.

- [ ] **Step 1: Relative-time formatter**

Append to `src/shared/lib/format.ts`:

```ts
const relativeUnits: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 525_600],
  ['month', 43_200],
  ['day', 1_440],
  ['hour', 60],
  ['minute', 1],
];

// "5 phút trước" / "3 hours ago". Returns null under one minute (or for a
// future timestamp) so the caller shows its own "just now" label.
export function formatRelativeTime(
  value: string,
  locale = vietnameseLocale,
  now = Date.now()
): string | null {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60_000);
  if (!(minutes >= 1)) return null;
  const [unit, size] = relativeUnits.find(([, size]) => minutes >= size) ?? [
    'minute',
    1,
  ];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    -Math.floor(minutes / size),
    unit
  );
}
```

Quick check in the browser console on the running dev server (no test runner in this repo):
`new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(-5, 'minute')` → `"5 phút trước"`.

- [ ] **Step 2: Schema and mapper**

In `deviceSchemas.ts`:

- `DeviceOwner.name` → `name?: string;` with the comment `// Omitted for roles without device.pii.full (§3.2 note).`
- `Device`: add `ward?: string;` under `region` with `// Ward/commune; region is the province.`
- `deviceOwnerDtoSchema.name` → `z.string().min(1).optional()`.
- `deviceDtoSchema`: add `ward: z.string().min(1).optional(),` under `region`.

In `deviceMapper.ts`:

- After `region: dto.region,` add `...(dto.ward && { ward: dto.ward }),`.
- Owner block becomes:

```ts
    ...(dto.owner && {
      owner: {
        id: dto.owner.id,
        ...(dto.owner.name && { name: dto.owner.name }),
        ...(dto.owner.phone_masked && { phoneMasked: dto.owner.phone_masked }),
      },
    }),
```

- [ ] **Step 3: Owner-name fallbacks on the detail page**

- `DeviceOverview.tsx:177`: `{device.owner.name}` → `{device.owner.name ?? device.owner.id}`
- `DeviceOwnershipPanel.tsx:36`: same replacement.
- `DeviceDeleteDialog.tsx:97`: `device.owner?.name ?? t('deleteDialog.noOwner')` → `device.owner?.name ?? device.owner?.id ?? t('deleteDialog.noOwner')`

- [ ] **Step 4: Table columns**

In `DeviceTable.tsx`:

- Import `formatDate`, `formatRelativeTime` next to `formatDateTimeInLocale` from `@/shared/lib/format`.
- Add above `FilterLifeIndicator`:

```ts
function lastSeenLabel(
  value: string | null,
  locale: string | undefined,
  justNow: string
): string {
  if (!value) return '—';
  return formatRelativeTime(value, locale) ?? justNow;
}
```

- In the `region` column render, the owner line becomes `{device.owner.name ?? device.owner.id}` and the location line becomes `{device.ward ? `${device.ward}, ${device.region}` : device.region}`.
- Insert after the `status` column:

```tsx
    {
      title: t('table.columns.lastSeen'),
      key: 'lastSeen',
      render: (_: unknown, device: Device) => (
        <span
          className="whitespace-nowrap text-xs text-[#636466]"
          title={formatDateTime(device.lastOnlineAt, i18n.resolvedLanguage)}
        >
          {lastSeenLabel(
            device.lastOnlineAt,
            i18n.resolvedLanguage,
            t('table.justNow')
          )}
        </span>
      ),
    },
```

- Insert after the `firmware` column:

```tsx
    {
      title: t('table.columns.activatedAt'),
      key: 'activatedAt',
      render: (_: unknown, device: Device) => (
        <span className="whitespace-nowrap text-xs">
          {formatDate(device.activatedAt)}
        </span>
      ),
    },
```

- Mobile card: `{device.modelName} · {device.region}` → `{device.modelName} · {device.ward ? `${device.ward}, ${device.region}` : device.region}`; the footer time becomes `time: lastSeenLabel(device.lastOnlineAt, i18n.resolvedLanguage, t('table.justNow'))`.
- Pagination `pageSizeOptions: [10, 20, 50]` stays.

- [ ] **Step 5: Export columns**

In `exportDevicesToCsv.ts`:

- `Owner` → `value: (d) => d.owner?.name ?? d.owner?.id ?? ''`
- After `Region` add `{ header: 'Ward', value: (d) => d.ward ?? '' },`
- After `Last online` add `{ header: 'Activated at', value: (d) => d.activatedAt ?? '' },`

- [ ] **Step 6: Mock data and masking**

`src/mocks/fixtures/devices.ts`, after `regions`:

```ts
const wardsByRegion: Record<(typeof regions)[number], readonly string[]> = {
  'Hà Nội': ['Phường Hoàng Mai', 'Phường Cầu Giấy', 'Phường Ba Đình'],
  'Hải Phòng': ['Phường Lê Chân', 'Phường Hồng Bàng', 'Phường Ngô Quyền'],
  'Đà Nẵng': ['Phường Hải Châu', 'Phường Sơn Trà', 'Phường Thanh Khê'],
  'Hồ Chí Minh': ['Phường Bến Thành', 'Phường Sài Gòn', 'Phường Tân Định'],
};
```

In the returned object: add `ward: wardsByRegion[region][index % 3],` after `region,`, and replace `last_online_at` with a spread relative to load time so every "vừa xong / phút / giờ" form shows:

```ts
      last_online_at:
        index === 35
          ? null
          : new Date(Date.now() - index * 17 * 60_000).toISOString(),
```

`src/mocks/handlers.ts` `deviceForRole` — strip owner PII for roles without `device.pii.full`:

```ts
  return {
    ...device,
    install_address: maskInstallAddress(device.install_address),
    ...(device.owner && { owner: { id: device.owner.id } }),
  };
```

- [ ] **Step 7: Locales**

`devices/locales/vi.json` `table`: add `"justNow": "Vừa xong"`; `columns.lastSeen: "Lần cuối kết nối"`, `columns.activatedAt: "Ngày kích hoạt"`; change `lastOnlineLabel` to `"Kết nối: {{time}}"`.
`en.json`: `"justNow": "Just now"`, `columns.lastSeen: "Last connected"`, `columns.activatedAt: "Activated on"`, `lastOnlineLabel: "Connected: {{time}}"`.

- [ ] **Step 8: Check**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

Manual: columns in order Serial/Model · Khách hàng & khu vực (`Phường …, Hà Nội`) · Trạng thái · Lần cuối kết nối (first row "Vừa xong", next "17 phút trước", later "x giờ trước"; hover shows the absolute time) · Tuổi thọ lõi · Firmware · Ngày kích hoạt · Thao tác. As Admin/TT DV the owner name shows; as KD/Nhà máy/Kho vận the customer ID (`CUS-…`) shows instead, in the table **and** in the exported CSV. Switch to EN: "5 minutes ago" style labels.

- [ ] **Step 9: Commit**

```bash
git add src/shared/lib/format.ts src/features/devices src/mocks
git commit -m "feat(devices): add last-seen, activation and ward columns with owner masking"
```

---

### Task 8: Full verification and spec sync

**Files:**

- Modify: `docs/CMS_QnA_V1_SPEC.md` only if behaviour differs from it (expected: no change)
- Modify: `docs/superpowers/specs/2026-09-22-dashboard-device-list-design.md` if implementation deviated

- [ ] **Step 1: Required checks**

Run: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`
Expected: all pass. On `format:check` failure run `pnpm format`, review the diff, and commit it.

- [ ] **Step 2: Hard-coded string sweep**

Run: `rg -nP '[à-ỹÀ-Ỹ]' src/features/dashboard src/features/devices --glob '!**/locales/**'`
Expected: nothing, apart from the `regionOptions` in `DeviceFilters.tsx` (business data, pre-existing).

- [ ] **Step 3: Role walkthrough with MSW (Playwright MCP)**

`pnpm dev`, then per role:

| Role    | Dashboard 1.3 exports | Dashboard 1.4          | Device list owner cell |
| ------- | --------------------- | ---------------------- | ---------------------- |
| Admin   | TDS + revenue         | shown, with export     | name                   |
| Nhà máy | TDS only              | hidden                 | customer ID            |
| TT DV   | none                  | shown, no export       | name                   |
| KD      | TDS + revenue         | shown, with export     | customer ID            |
| Kho vận | none                  | hidden                 | customer ID            |

Also check: `?mock_error=500` on `/devices` shows the route error state; F5 on `/devices?status=warning&page=2` keeps the filters; EN/VI toggle leaves no raw keys.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: format and verify dashboard and device list"
```

(skip if nothing changed)

- [ ] **Step 5: PR**

Push `feat/m01-dashboard-m03-device-list` and open a PR against `main` listing: spec §1 / §3.1–3.3, the two new capabilities, the assumptions from the design doc, the commands run, and screenshots of the dashboard and device list as Admin and KD. Known follow-up to list in the PR: device detail (§3.4) still renders the owner block for every role; it now falls back to the customer ID but should be hidden for Nhà máy/KD/Kho vận.
