# Portal reference UI design

## Goal

Recreate the supplied Portal reference UI in the existing Vite + React CMS.
The deliverable is a responsive, mock-backed internal portal that matches the
reference's information architecture, visual hierarchy, copy, controls, and
demonstration interactions while preserving this repository's feature-first
boundaries and capability-based navigation.

## Scope

The implementation covers the shared portal shell and these feature pages:

- Overview dashboard
- Devices and device detail
- Alerts
- OTA firmware
- Device map
- Customers, warranty, and service bookings
- Filter QR batches
- Analytics and reports

The UI uses only local mock data. Buttons and controls reproduce the reference
demonstration behavior locally; they do not claim to persist data, call an
external system, or implement production business workflows.

## Architecture

### Shared application chrome

`src/shared/components/AppShell.tsx` remains the single authenticated shell.
It will be split into focused shared presentation components for the branded
sidebar, top bar, and mobile navigation drawer. The shell derives its menu
from `ROLE_MENU_KEYS` through `hasMenuAccess`; no component branches on a role
name. It remains responsible for the existing role switcher and sign out.

The global Ant Design theme and CSS establish the reference's light surfaces,
orange primary action, soft borders, rounded cards, typography scale, and
responsive page gutters. Ant Design provides enterprise controls; Tailwind
classes provide composition, spacing, and reference-specific presentation.

### Feature ownership

Each new reference area is an independent `src/features/<name>/` vertical
slice. A slice owns its mock data, view models/types, page, and reusable
components. The existing `devices` slice is extended rather than duplicated.
The `portal` placeholder page is retired only once every corresponding route
renders a feature-owned page.

Feature-local mock state is intentionally isolated in page hooks/components so
the visual prototype can support filters, tabs, search, and state transitions
without creating fake API contracts. Existing device API schemas, mappers, and
query factories remain the source for the current device list/detail flow.

### Reusable UI

Feature-neutral building blocks live in `src/shared/components`: the page
header, surface/card treatment, stat card, severity/status tag, chart wrapper,
and chart primitives. The reusable components accept typed props and do not
know about feature data. Feature-specific table columns, map markers, OTA
campaign views, and customer tabs stay in their owning slice.

## Page behaviour

| Area | Reference behaviour reproduced with mocks |
| --- | --- |
| Dashboard | Role scope callout, six KPIs, online/TDS/revenue visuals, active-alert summary and route links. |
| Devices | Existing URL-backed search/pagination and detail route, restyled to the reference; device cards/table and detail telemetry/history remain capability-aware. |
| Alerts | Severity segment filter, resolved toggle, local assign-to-current-user and resolve state changes, SLA labels. |
| OTA | Campaign status/progress display and local pause/continue/cancel demonstration actions. |
| Map | Region and status filtering, mock device markers/list selection; the visual map is a local presentation, not a geographic service. |
| Customers | Search plus tabs for customer profiles, expiring warranties, and bookings with mock assignment/status changes. |
| QR | Search/region filters, derived totals and usage bars for local batch data. |
| Analytics | Period selector presentation, export feedback, KPI cards, reusable chart views, and the error breakdown table. |

Routes stay thin: route access checks and validated search live in
`src/routes`; pages and components live in their feature. The generated route
tree is never edited manually.

## Authorization and privacy

Navigation visibility stays controlled by the current named menu permissions.
Existing device actions retain `PermissionGuard`/`hasCapability` use.
For mock-only pages without an approved capability matrix, the current
menu-level access is the boundary; the work will not invent additional
production permissions. Customer PII is rendered only on the already allowed
customer screen and remains absent from roles whose menu cannot access it.

## Error, empty, and responsive states

Existing `PageState` handles loading, forbidden, error, and not-found cases.
Mock collections show an explicit empty state after filtering. Tables scroll
horizontally on constrained screens; navigation collapses into the mobile
drawer; cards/charts change from multi-column grids to one column according to
the reference layout.

## Verification

After implementation, run `pnpm lint`, `pnpm typecheck`, `pnpm format:check`,
and `pnpm build`. Manually inspect desktop and mobile layouts in mock mode,
including menu visibility across all six roles, denied routes, filtered-empty
states, and each local demonstration interaction.

## Non-goals

This task does not add a charting, map, or backend dependency; create real API
endpoints; change the existing authorization contract; or introduce automated
test tooling.
