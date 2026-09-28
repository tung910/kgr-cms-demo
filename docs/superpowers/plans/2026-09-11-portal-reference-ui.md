# Portal Reference UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Recreate the supplied Portal reference as a responsive, capability-aware, mock-backed CMS UI.

**Architecture:** Extend the feature-first application with shared reference presentation primitives, decomposed authenticated navigation, and feature-owned page/components/mock data. Routes only guard and render pages; all UI state is local mock state until an approved API contract exists.

**Tech Stack:** React 19, TypeScript 5, Vite, TanStack Router/Query, Ant Design 6, Tailwind CSS 4, MSW.

**Spec:** \`docs/superpowers/specs/2026-09-11-portal-reference-ui-design.md\`

## Global Constraints

- Use Node.js 24+ and pnpm 10+.
- Use strict TypeScript, two spaces, single quotes, and no semicolons.
- Use Ant Design for enterprise controls and Tailwind CSS for layout, responsive behavior, spacing, and custom presentation; do not deeply override Ant Design internals.
- Keep app composition in \`src/app\`, cross-cutting code in \`src/core\`, feature-neutral UI in \`src/shared\`, and business screens under \`src/features/<feature>/\`.
- Routes validate/guard and render feature pages only; never edit \`src/routeTree.gen.ts\`.
- Do not branch on role names in UI/routes. Use \`hasMenuAccess\`, \`hasCapability\`, and \`PermissionGuard\`.
- Do not add a testing framework or test files. Verify with lint, typecheck, format check, build, and manual mock-mode flows.
- Do not add charting, map, or backend dependencies.

---

## File structure

- \`src/shared/components/portal/*\`: feature-neutral card, heading, metric, chart and navigation pieces.
- \`src/features/<feature>/mocks/*\`: immutable typed data for exactly one feature.
- \`src/features/<feature>/components/*\`: feature UI and local interactions.
- \`src/features/<feature>/pages/*\`: page composition.
- \`src/routes/_authenticated/*.tsx\`: existing thin access routes, updated to render a feature page.

### Task 1: Reference tokens, UI primitives, and application shell

**Files:**
- Modify: \`src/theme/tokens.ts\`
- Modify: \`src/theme/theme.ts\`
- Modify: \`src/app/styles/index.css\`
- Modify: \`src/shared/components/AppShell.tsx\`
- Create: \`src/shared/components/portal/PortalCard.tsx\`
- Create: \`src/shared/components/portal/PortalPageHeader.tsx\`
- Create: \`src/shared/components/portal/PortalStatCard.tsx\`
- Create: \`src/shared/components/portal/PortalChart.tsx\`
- Create: \`src/shared/components/portal/PortalSidebar.tsx\`
- Create: \`src/shared/components/portal/PortalTopbar.tsx\`
- Create: \`src/shared/components/portal/PortalMobileNav.tsx\`

**Interfaces:**
- Produces \`PortalCard\`, \`PortalPageHeader\`, \`PortalStatCard\`, and \`PortalChart\` for feature pages.
- \`AppShell\` owns responsive/collapsed/drawer state; presentation components receive typed items, selected route, and callbacks.

- [ ] **Step 1: Add reference colors and supported AntD theme tokens**

~~~ts
export const referenceColors = {
  canvas: '#F7F8F8',
  card: '#FFFFFF',
  border: '#E7E8E9',
  primary: '#F16522',
  info: '#38C4FF',
  warning: '#CA9326',
  danger: '#D9131F',
} as const
~~~

- [ ] **Step 2: Create typed shared primitives without feature data**

~~~tsx
export interface PortalPageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PortalPageHeader({ title, description, actions }: PortalPageHeaderProps) {
  return <div className="flex flex-wrap items-start justify-between gap-3">...</div>
}
~~~

- [ ] **Step 3: Extract sidebar, topbar, and mobile drawer; preserve role switching/sign out**

~~~ts
const visibleItems = navigationItems.filter(
  (item) => item.key === 'overview' || hasMenuAccess(session.role, item.key),
)
~~~

- [ ] **Step 4: Verify static checks and responsive shell**

Run: \`pnpm lint && pnpm typecheck && pnpm format:check\`; then run \`pnpm dev\` and inspect at 1440px, 1024px, and 375px.

Expected: checks exit 0; desktop sidebar collapses and the mobile drawer is usable.

- [ ] **Step 5: Commit**

~~~bash
git add src/theme src/app/styles/index.css src/shared/components
git commit -m "feat: add portal reference shell and primitives"
~~~

### Task 2: Recreate dashboard and restyle devices/detail

**Files:**
- Modify: \`src/features/dashboard/mocks/dashboardMockData.ts\`
- Modify: \`src/features/dashboard/pages/DashboardPage.tsx\`
- Create: \`src/features/dashboard/components/RoleScopeBanner.tsx\`
- Create: \`src/features/dashboard/components/ActiveAlertsPanel.tsx\`
- Modify: \`src/features/devices/components/DeviceFilters.tsx\`
- Modify: \`src/features/devices/components/DeviceTable.tsx\`
- Modify: \`src/features/devices/components/DeviceOverview.tsx\`
- Modify: \`src/features/devices/pages/DeviceListPage.tsx\`
- Modify: \`src/features/devices/pages/DeviceDetailPage.tsx\`
- Create: \`src/features/devices/components/DeviceHealthSummary.tsx\`
- Create: \`src/features/devices/components/DeviceHistoryPanel.tsx\`

**Interfaces:**
- Dashboard owns \`TrendPoint\` and \`DashboardAlert\`; devices consume the existing mapped \`Device\` model only.
- Device PII/actions remain inside existing \`PermissionGuard\`/capability checks.

- [ ] **Step 1: Add immutable dashboard mock data for six metrics, online trend, regional TDS, revenue and active alerts**

~~~ts
export interface TrendPoint { label: string; online: number; active: number }
export interface DashboardAlert { id: string; label: string; serial: string; region: string; severity: 'high' | 'medium' | 'low' }
~~~

- [ ] **Step 2: Compose dashboard with shared cards/charts, role banner, alert links and conditional devices CTA**

~~~tsx
const canAccessDevices = Boolean(session && hasMenuAccess(session.role, 'devices'))
~~~

- [ ] **Step 3: Apply reference filter/card/table/detail visual treatment without changing existing URL search or device API boundaries**

~~~tsx
<PermissionGuard capability="device.view_owner" fallback={null}>
  <Descriptions.Item label="Chủ sở hữu">{device.ownerName}</Descriptions.Item>
</PermissionGuard>
~~~

- [ ] **Step 4: Verify dashboard/device URLs, page state, PII and commands across roles**

Run: \`pnpm lint && pnpm typecheck && pnpm format:check && pnpm build\`; manually exercise device search/pagination/detail in mock mode.

Expected: all commands exit 0; existing URL filters remain intact and unauthorized PII/action controls are hidden.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/dashboard src/features/devices
git commit -m "feat: recreate reference dashboard and device views"
~~~

### Task 3: Build Alerts and OTA slices

**Files:**
- Create: \`src/features/alerts/mocks/alertMockData.ts\`
- Create: \`src/features/alerts/components/AlertFilters.tsx\`
- Create: \`src/features/alerts/components/AlertList.tsx\`
- Create: \`src/features/alerts/pages/AlertsPage.tsx\`
- Create: \`src/features/firmware/mocks/firmwareMockData.ts\`
- Create: \`src/features/firmware/components/FirmwareCampaignCard.tsx\`
- Create: \`src/features/firmware/pages/FirmwarePage.tsx\`
- Modify: \`src/routes/_authenticated/alerts.tsx\`
- Modify: \`src/routes/_authenticated/firmware.tsx\`

**Interfaces:**
- \`AlertList({ alerts, onAssign, onResolve })\` uses local callbacks.
- \`FirmwareCampaignCard({ campaign, onAction })\` accepts \`onAction(id, action)\`, where action is \`'pause' | 'resume' | 'cancel'\`.

- [ ] **Step 1: Define explicit mock state unions**

~~~ts
export type AlertStatus = 'new' | 'assigned' | 'resolved'
export type AlertSeverity = 'high' | 'medium' | 'low'
export type FirmwareAction = 'pause' | 'resume' | 'cancel'
~~~

- [ ] **Step 2: Implement alert severity/resolved filters and local assignment/close transitions**

~~~ts
const assignAlert = (id: string) =>
  setAlerts((items) => items.map((item) =>
    item.id === id ? { ...item, status: 'assigned', assignee: 'Bạn' } : item,
  ))
~~~

- [ ] **Step 3: Implement campaign status/progress cards and local OTA action feedback, then render these feature pages from existing routes**

~~~tsx
<FirmwareCampaignCard campaign={campaign} onAction={handleCampaignAction} />
~~~

- [ ] **Step 4: Verify filtering, empty state, actions, and route denial**

Run: \`pnpm lint && pnpm typecheck && pnpm format:check && pnpm build\`.

Expected: all commands exit 0; state changes only in the active browser session.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/alerts src/features/firmware src/routes/_authenticated/alerts.tsx src/routes/_authenticated/firmware.tsx
git commit -m "feat: add reference alerts and firmware views"
~~~

### Task 4: Build map and QR filter slices

**Files:**
- Create: \`src/features/maps/mocks/mapMockData.ts\`
- Create: \`src/features/maps/components/DeviceMapCanvas.tsx\`
- Create: \`src/features/maps/components/MapFilters.tsx\`
- Create: \`src/features/maps/pages/MapPage.tsx\`
- Create: \`src/features/qr-filter/mocks/qrBatchMockData.ts\`
- Create: \`src/features/qr-filter/components/QrBatchCard.tsx\`
- Create: \`src/features/qr-filter/pages/QrFilterPage.tsx\`
- Modify: \`src/routes/_authenticated/maps.tsx\`
- Modify: \`src/routes/_authenticated/qr-filter.tsx\`

**Interfaces:**
- \`DeviceMapCanvas({ markers, selectedMarkerId, onSelectMarker })\` renders local coordinates without an external map service.
- \`QrBatchCard({ batch })\` computes presentation from typed batch values.

- [ ] **Step 1: Add typed map/QR mocks**

~~~ts
export interface MapMarker { id: string; region: string; status: 'online' | 'offline' | 'alert'; x: number; y: number }
export interface QrBatch { id: string; model: string; region: string; total: number; used: number; expired: number; uploadedAt: string }
~~~

- [ ] **Step 2: Build the reference map grid, status/region filtering and selected-marker detail**

~~~tsx
<button
  aria-pressed={marker.id === selectedMarkerId}
  style={{ left: marker.x + '%', top: marker.y + '%' }}
  onClick={() => onSelectMarker(marker.id)}
/>
~~~

- [ ] **Step 3: Build QR search/region filters, totals, batch progress cards, and empty state**

~~~ts
const remaining = batch.total - batch.used - batch.expired
const usedPercent = Math.round((batch.used / batch.total) * 100)
~~~

- [ ] **Step 4: Verify responsive filters and routes**

Run: \`pnpm dev\`.

Expected: map selection and QR filtering update locally; mobile cards and controls remain usable.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/maps src/features/qr-filter src/routes/_authenticated/maps.tsx src/routes/_authenticated/qr-filter.tsx
git commit -m "feat: add reference map and QR filter views"
~~~

### Task 5: Build customer service and analytics slices

**Files:**
- Create: \`src/features/customers/mocks/customerMockData.ts\`
- Create: \`src/features/customers/components/CustomerTable.tsx\`
- Create: \`src/features/customers/components/WarrantyPanel.tsx\`
- Create: \`src/features/customers/components/BookingList.tsx\`
- Create: \`src/features/customers/pages/CustomersPage.tsx\`
- Create: \`src/features/analytics/mocks/analyticsMockData.ts\`
- Create: \`src/features/analytics/components/ErrorBreakdownTable.tsx\`
- Create: \`src/features/analytics/pages/AnalyticsPage.tsx\`
- Modify: \`src/routes/_authenticated/customers.tsx\`
- Modify: \`src/routes/_authenticated/analytics-reports.tsx\`
- Modify: \`src/features/portal/pages/PortalSectionPage.tsx\`

**Interfaces:**
- \`CustomerTable({ customers })\` is display-only; \`BookingList({ bookings, onAssign, onComplete })\` receives local callbacks.
- \`ErrorBreakdownTable({ errors })\` derives safe percentages from \`ErrorBreakdown[]\`.
- \`PortalSectionPage\` remains only for routes outside the reference scope.

- [ ] **Step 1: Define mock types and immutable collections**

~~~ts
export type WarrantyStatus = 'active' | 'expiring' | 'expired'
export type BookingStatus = 'pending' | 'assigned' | 'done'
export interface ErrorBreakdown { code: string; label: string; count: number }
~~~

- [ ] **Step 2: Implement customer tabs/search/warranty summary/bookings transitions with AntD \`Tabs\`, \`Table\`, \`Input\`, and \`Button\`**

~~~tsx
<Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
~~~

- [ ] **Step 3: Implement analytics toolbar, KPIs, shared charts, error breakdown, and export feedback without generating a fake file**

~~~ts
const percentage = totalErrors === 0 ? 0 : Math.round((item.count / totalErrors) * 100)
message.success('Đã chuẩn bị báo cáo mẫu để xuất')
~~~

- [ ] **Step 4: Replace covered placeholder route usage and verify final routes**

Run: \`rg -n "PortalSectionPage" src/routes/_authenticated && pnpm lint && pnpm typecheck && pnpm format:check && pnpm build\`.

Expected: no covered reference route imports \`PortalSectionPage\`; all checks exit 0.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/customers src/features/analytics src/features/portal src/routes/_authenticated/customers.tsx src/routes/_authenticated/analytics-reports.tsx
git commit -m "feat: add reference customer and analytics views"
~~~

### Task 6: Verify complete portal reference flow

**Files:**
- Modify: only formatter/linter fixes within the files above.

**Interfaces:**
- Consumes all completed route pages, shell components and existing mock auth adapter.
- Produces a verified build without generated route-tree edits or unrelated changes.

- [ ] **Step 1: Format only implementation-scope files**

Run: \`pnpm format\` with an explicit list of changed \`src/\` files from \`git diff --name-only\`.

Expected: formatting does not touch user-owned files.

- [ ] **Step 2: Run required checks**

Run: \`pnpm lint && pnpm typecheck && pnpm format:check && pnpm build\`.

Expected: all commands exit 0.

- [ ] **Step 3: Manually inspect mock mode**

Run: \`pnpm dev\`.

Check: desktop/mobile dashboard, devices/detail, alerts, OTA, map, customers tabs, QR, analytics; six role menus; denied routes; filtered empty states; alert/booking/OTA local transitions.

- [ ] **Step 4: Verify repository scope**

Run: \`git diff --check && git diff -- src/routeTree.gen.ts && git status --short\`.

Expected: whitespace check exits 0 and \`src/routeTree.gen.ts\` has no manual changes.

- [ ] **Step 5: Commit verification fixes if present**

~~~bash
git add <only-files-fixed-during-verification>
git commit -m "chore: verify portal reference UI"
~~~

## Self-review

- Spec coverage: Task 1 covers the shared visual system and responsive shell; Task 2 dashboard/devices; Task 3 alerts/OTA; Task 4 map/QR; Task 5 customers/warranty/bookings/analytics/routes; Task 6 full validation.
- No test framework is planned because repository guidance explicitly forbids adding one without separate approval.
- Types are produced within the task that first needs them, and mock data remains feature-local.

