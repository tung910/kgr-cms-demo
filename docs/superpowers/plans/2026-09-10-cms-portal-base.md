# CMS Portal Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready React/Vite frontend foundation with mock authentication, capability-based RBAC, a transport-neutral TanStack Query API layer, and a representative device-management vertical slice.

**Architecture:** Use a feature-first modular monolith. Cross-cutting configuration, authentication, permissions, and HTTP transport live under `core`; reusable UI lives under `shared`; the device feature owns its DTOs, schemas, mappers, API functions, query options, components, and pages. TanStack Router route files stay thin and reuse feature-owned pages and query options.

**Tech Stack:** React, TypeScript, Vite, pnpm, TanStack Router, TanStack Query, Ant Design, Tailwind CSS, Axios, Zod, MSW, React Hook Form, ESLint, and Prettier.

**Spec:** `docs/superpowers/specs/2026-09-10-cms-portal-base-design.md`

## Global Constraints

- Use TypeScript strict mode.
- Use Ant Design for enterprise controls and Tailwind CSS for layout, responsive behavior, spacing, and custom presentation.
- Do not deeply override Ant Design internal CSS.
- Do not combine Ant Design Form and React Hook Form in the same form.
- Components and routes check capabilities, never role names.
- Features must not import Axios-specific types.
- `shared` must not import from `features`; `core` must not import from a business feature.
- Keep DTOs separate from UI domain models and validate API responses with Zod at the boundary.
- The portal is desktop-first and must remain usable on tablets.
- Do not install Vitest or React Testing Library. Do not create test files or `tests/` directories.
- Verification for every implementation task is lint, TypeScript checking, and/or production build as specified.
- Preserve the untracked user-owned `PORTAL_FUNCTIONAL_SPEC.html`; do not stage or modify it.

---

## File Map

### Root configuration

- `package.json`: dependencies and development scripts.
- `pnpm-lock.yaml`: reproducible dependency resolution.
- `index.html`: Vite entry document.
- `vite.config.ts`: React, TanStack Router, Tailwind, aliases, and dev build configuration.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: strict TypeScript projects and aliases.
- `eslint.config.js`: flat ESLint configuration for React and TypeScript.
- `.prettierrc.json`, `.prettierignore`: formatting rules.
- `.env.example`: documented mock/API configuration.

### Application bootstrap

- `src/main.tsx`: initialize optional development mocks and mount React.
- `src/app/App.tsx`: render the router provider.
- `src/app/providers/AppProviders.tsx`: Ant Design and TanStack Query providers.
- `src/app/providers/queryClient.ts`: cache defaults and retry policy.
- `src/app/router/router.ts`: generated route tree integration and router context.
- `src/app/styles/index.css`: Tailwind import and small global baseline.
- `src/vite-env.d.ts`: Vite environment declarations.

### Core boundaries

- `src/core/config/env.ts`: validate and expose environment configuration.
- `src/core/api/types.ts`: transport-neutral request and error contracts.
- `src/core/api/apiClient.ts`: Axios-backed `ApiClient` implementation.
- `src/core/api/error.ts`: normalize Axios/network/backend errors.
- `src/core/auth/types.ts`: session, role, and authentication adapter contracts.
- `src/core/auth/mockAuthAdapter.ts`: localStorage-backed mock session.
- `src/core/auth/AuthProvider.tsx`: session state and authentication actions.
- `src/core/auth/useAuth.ts`: safe context access.
- `src/core/permissions/capabilities.ts`: capability constants and role mapping.
- `src/core/permissions/PermissionGuard.tsx`: declarative capability gate.

### Shared UI

- `src/shared/components/AppShell.tsx`: sidebar, header, breadcrumbs, responsive shell, and user actions.
- `src/shared/components/PageState.tsx`: loading, empty, error, forbidden, and not-found presentation.
- `src/shared/components/PageHeader.tsx`: consistent title and action layout.
- `src/shared/components/StatusTag.tsx`: shared status-to-color display.
- `src/shared/lib/format.ts`: safe date/time and fallback formatting.
- `src/shared/types/pagination.ts`: pagination request and response shapes.

### Device feature

- `src/features/devices/model/device.ts`: UI domain model and filter types.
- `src/features/devices/schemas/deviceSchemas.ts`: Zod DTO schemas.
- `src/features/devices/api/deviceMapper.ts`: DTO-to-domain mapping.
- `src/features/devices/api/deviceApi.ts`: list/detail API calls.
- `src/features/devices/queries/deviceQueries.ts`: query option factories.
- `src/features/devices/components/DeviceFilters.tsx`: URL-backed filter controls.
- `src/features/devices/components/DeviceTable.tsx`: paginated Ant Design table.
- `src/features/devices/components/DeviceOverview.tsx`: detail descriptions and telemetry.
- `src/features/devices/pages/DeviceListPage.tsx`: list orchestration.
- `src/features/devices/pages/DeviceDetailPage.tsx`: detail orchestration.

### Routing and mocks

- `src/routes/__root.tsx`: router root and context.
- `src/routes/login.tsx`: public login route.
- `src/routes/_authenticated.tsx`: authenticated shell route and guard.
- `src/routes/_authenticated/index.tsx`: default redirect to devices.
- `src/routes/_authenticated/devices/index.tsx`: validated list route and prefetch.
- `src/routes/_authenticated/devices/$deviceId.tsx`: detail route and prefetch.
- `src/routes/403.tsx`, `src/routes/$.tsx`: forbidden and not-found routes.
- `src/mocks/browser.ts`: MSW browser worker.
- `src/mocks/handlers.ts`: auth-independent device handlers with PII filtering.
- `src/mocks/fixtures/devices.ts`: deterministic mock device data.
- `public/mockServiceWorker.js`: generated MSW service worker.

---

### Task 1: Bootstrap the frontend toolchain

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.env.example`
- Create: `src/vite-env.d.ts`
- Create: `src/app/styles/index.css`

**Interfaces:**
- Consumes: Node.js 24 and pnpm 12 available in the workspace.
- Produces: `@/* -> src/*` alias, Vite dev/build commands, TanStack Router file generation, Tailwind processing, and quality scripts.

- [ ] **Step 1: Create package metadata and scripts**

Define `package.json` as a private ESM package. Include scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Install runtime dependencies: `@ant-design/icons`, `@tanstack/react-query`, `@tanstack/react-router`, `antd`, `axios`, `dayjs`, `msw`, `react`, `react-dom`, `react-hook-form`, and `zod`.

Install development dependencies: `@eslint/js`, `@tanstack/router-plugin`, `@tailwindcss/vite`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react-swc`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier`, `tailwindcss`, `typescript`, `typescript-eslint`, and `vite`.

- [ ] **Step 2: Configure Vite, Router generation, Tailwind, and aliases**

Use the React SWC plugin, TanStack Router Vite plugin with `src/routes` as the route directory, and Tailwind Vite plugin. Resolve `@` to `src`. Keep route generation enabled during dev and build.

- [ ] **Step 3: Configure strict TypeScript and linting**

Enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `moduleResolution: Bundler`. Configure ESLint flat config for browser TypeScript/React files and ignore `dist` plus generated `src/routeTree.gen.ts`.

- [ ] **Step 4: Add styling and environment examples**

Import Tailwind in `src/app/styles/index.css`, establish `body { margin: 0; min-width: 320px; }`, and avoid component-specific styling. Document:

```dotenv
VITE_API_BASE_URL=/api
VITE_ENABLE_MOCKS=true
```

- [ ] **Step 5: Install dependencies and verify the toolchain**

Run:

```bash
pnpm install
pnpm exec tsc -b --pretty false
```

Expected: dependencies resolve, `pnpm-lock.yaml` is created, and TypeScript reports only missing application-entry files that will be introduced in Task 2. If Vite configuration itself fails, fix it before continuing.

- [ ] **Step 6: Commit the toolchain**

```bash
git add package.json pnpm-lock.yaml index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js .prettierrc.json .prettierignore .env.example src/vite-env.d.ts src/app/styles/index.css
git commit -m "build: bootstrap react vite toolchain"
```

### Task 2: Build configuration, API, and query foundations

**Files:**
- Create: `src/core/config/env.ts`
- Create: `src/core/api/types.ts`
- Create: `src/core/api/error.ts`
- Create: `src/core/api/apiClient.ts`
- Create: `src/app/providers/queryClient.ts`
- Create: `src/shared/types/pagination.ts`

**Interfaces:**
- Consumes: `VITE_API_BASE_URL`, `VITE_ENABLE_MOCKS`.
- Produces: `env`, `ApiClient`, singleton `apiClient`, `ApiError`, `normalizeApiError`, `queryClient`, `PageRequest`, and `PageResponse<T>`.

- [ ] **Step 1: Define and validate environment configuration**

Create a Zod schema that defaults the base URL to `/api`, converts `VITE_ENABLE_MOCKS` from the strings `true` or `false`, and exports:

```ts
export interface AppEnv {
  apiBaseUrl: string
  enableMocks: boolean
}

export const env: AppEnv
```

Throw a readable startup error listing invalid environment keys.

- [ ] **Step 2: Define transport-neutral API contracts**

Create:

```ts
export type ApiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'network'
  | 'server'
  | 'invalidResponse'
  | 'unknown'

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  )
}

export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<TResponse, TBody = unknown>(path: string, body: TBody, options?: RequestOptions): Promise<TResponse>
  put<TResponse, TBody = unknown>(path: string, body: TBody, options?: RequestOptions): Promise<TResponse>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
}
```

- [ ] **Step 3: Implement Axios transport and error normalization**

Create one Axios instance using `env.apiBaseUrl`. Implement the `ApiClient` interface without exporting the Axios instance or Axios types. Map status `401`, `403`, `404`, `400/422`, other `5xx`, request-without-response, and unknown failures to `ApiErrorKind`. Preserve safe backend error details when present.

- [ ] **Step 4: Configure TanStack Query defaults**

Export a singleton `queryClient` with five-minute stale time. Retry no client error; retry network/server errors no more than twice; do not refetch automatically on window focus. Leave mutation retry disabled.

- [ ] **Step 5: Define pagination primitives**

```ts
export interface PageRequest {
  page: number
  pageSize: number
}

export interface PageResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
```

- [ ] **Step 6: Verify and commit**

Run `pnpm typecheck` and `pnpm lint`. Expected: both exit successfully for the files now present.

```bash
git add src/core src/app/providers/queryClient.ts src/shared/types/pagination.ts
git commit -m "feat: add api and query foundations"
```

### Task 3: Implement mock authentication and capability RBAC

**Files:**
- Create: `src/core/auth/types.ts`
- Create: `src/core/auth/mockAuthAdapter.ts`
- Create: `src/core/auth/AuthProvider.tsx`
- Create: `src/core/auth/useAuth.ts`
- Create: `src/core/permissions/capabilities.ts`
- Create: `src/core/permissions/PermissionGuard.tsx`

**Interfaces:**
- Consumes: browser local storage and the capability definitions in this task.
- Produces: `PortalRole`, `AuthSession`, `AuthAdapter`, `MockAuthAdapter`, `AuthProvider`, `useAuth()`, `CAPABILITIES`, `ROLE_CAPABILITIES`, `hasCapability()`, and `PermissionGuard`.

- [ ] **Step 1: Define auth contracts and six roles**

Use stable role values:

```ts
export type PortalRole =
  | 'system_admin'
  | 'technical_operations'
  | 'customer_service'
  | 'warehouse_production'
  | 'business'
  | 'read_only'

export interface AuthSession {
  user: { id: string; name: string; email: string }
  role: PortalRole
}

export interface AuthAdapter {
  restore(): Promise<AuthSession | null>
  signIn(role: PortalRole): Promise<AuthSession>
  signOut(): Promise<void>
}
```

- [ ] **Step 2: Define capabilities and role mappings**

Define literal capabilities `device.read`, `device.view_owner`, `device.export`, and `device.command`. Give all roles `device.read`; withhold `device.view_owner` from warehouse/production and read-only; grant commands only to system administrator and technical operations; grant export only to system administrator, technical operations, customer service, and business.

- [ ] **Step 3: Implement the mock adapter**

Persist only a validated role in `localStorage` under a namespaced key. Construct deterministic user data for the selected role. Invalid stored values restore as signed out. Expose no SSO assumptions.

- [ ] **Step 4: Implement provider and hook**

`AuthProvider` restores the session once, exposes `status: 'loading' | 'authenticated' | 'anonymous'`, `session`, `signIn(role)`, `signOut()`, and `switchRole(role)`. `useAuth()` throws a clear error outside the provider.

- [ ] **Step 5: Implement capability helpers and guard**

```ts
export function hasCapability(role: PortalRole, capability: Capability): boolean

export interface PermissionGuardProps {
  capability: Capability
  fallback?: ReactNode
  children: ReactNode
}
```

The component derives authorization from `useAuth()` and returns the fallback when access is absent.

- [ ] **Step 6: Verify and commit**

Run `pnpm typecheck` and `pnpm lint`; both must pass.

```bash
git add src/core/auth src/core/permissions
git commit -m "feat: add mock authentication and rbac"
```

### Task 4: Build application providers, shell, and routes

**Files:**
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/providers/AppProviders.tsx`
- Create: `src/app/router/router.ts`
- Create: `src/shared/components/AppShell.tsx`
- Create: `src/shared/components/PageState.tsx`
- Create: `src/shared/components/PageHeader.tsx`
- Create: `src/shared/components/StatusTag.tsx`
- Create: `src/shared/lib/format.ts`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/login.tsx`
- Create: `src/routes/_authenticated.tsx`
- Create: `src/routes/_authenticated/index.tsx`
- Create: `src/routes/403.tsx`
- Create: `src/routes/$.tsx`
- Generate: `src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `queryClient`, `AuthProvider`, auth state, and capability helpers.
- Produces: mounted application, router context `{ queryClient, auth }`, public login, protected shell, forbidden page, and not-found page.

- [ ] **Step 1: Create shared state and formatting components**

Create focused components for page title/actions, loading/empty/error feedback, forbidden/not-found feedback, and status tags. `PageState` must accept a retry callback for errors. Date formatting must return `—` for missing/invalid values and use Vietnamese locale display.

- [ ] **Step 2: Create the responsive application shell**

Use Ant Design `Layout`, `Menu`, `Breadcrumb`, `Dropdown`, and `Avatar`. Desktop shows a collapsible sidebar; tablet uses the collapsed state. The user menu shows the current role, supports switching among all six mock roles, and supports logout. Only render device navigation when `device.read` is present.

- [ ] **Step 3: Create root and public login routes**

The root supplies router context and global error/pending components. Login displays one button/card per role, calls `signIn(role)`, and navigates to the validated `redirect` search parameter or the authenticated index route. Authenticated users visiting login are redirected to the authenticated index route. Task 6 changes that index route to redirect to `/devices` after the device routes exist.

- [ ] **Step 4: Create the authenticated route guard and shell route**

Before loading protected children, wait for restored auth state. Anonymous users redirect to `/login?redirect=<current-path>`. Render `AppShell` and `<Outlet />` for authenticated sessions. Until Task 6 adds device routes, the authenticated index renders a small welcome page using `PageHeader`.

- [ ] **Step 5: Configure providers, router, and bootstrap**

Wrap the app in Ant Design `ConfigProvider` using initial KGR-neutral theme tokens, `QueryClientProvider`, and `AuthProvider`. Create the router with the generated route tree and register router types. `main.tsx` imports global CSS, conditionally starts mocks before rendering, and never statically imports mocks when disabled:

```ts
async function enableMocking() {
  if (!env.enableMocks || !import.meta.env.DEV) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}
```

- [ ] **Step 6: Generate route tree, verify, and commit**

Run `pnpm exec vite build` to generate the route tree, then `pnpm lint`, `pnpm typecheck`, and `pnpm build`. All must pass with the authenticated welcome page in place.

```bash
git add src/main.tsx src/app src/shared src/routes src/routeTree.gen.ts
git commit -m "feat: add app shell and protected routing"
```

### Task 5: Implement device contracts, API, query options, and mocks

**Files:**
- Create: `src/features/devices/model/device.ts`
- Create: `src/features/devices/schemas/deviceSchemas.ts`
- Create: `src/features/devices/api/deviceMapper.ts`
- Create: `src/features/devices/api/deviceApi.ts`
- Create: `src/features/devices/queries/deviceQueries.ts`
- Create: `src/mocks/fixtures/devices.ts`
- Create: `src/mocks/handlers.ts`
- Create: `src/mocks/browser.ts`
- Generate: `public/mockServiceWorker.js`

**Interfaces:**
- Consumes: `apiClient`, `ApiError`, `PageResponse<T>`, and mock role stored by the auth adapter.
- Produces: `Device`, `DeviceListFilters`, `getDevices()`, `getDevice()`, `deviceQueries.list(filters)`, `deviceQueries.detail(id)`, and MSW endpoints `GET /api/devices` plus `GET /api/devices/:deviceId`.

- [ ] **Step 1: Define domain models and filters**

Model device identifiers, model name, region, connection status, last online time, module/mainboard firmware versions, optional owner, and latest telemetry. Use:

```ts
export type DeviceStatus = 'online' | 'offline' | 'warning'

export interface DeviceListFilters {
  search: string
  status?: DeviceStatus
  model?: string
  region?: string
  page: number
  pageSize: number
}
```

- [ ] **Step 2: Define external DTO schemas**

Create Zod schemas using backend-style snake_case fields. The paginated schema must validate `items`, `page`, `page_size`, and `total`. Detail telemetry contains a metric key, value, unit, and measured timestamp. Owner is optional so warehouse/read-only payloads remain valid.

- [ ] **Step 3: Map validated DTOs to domain models**

Implement pure mappers that rename fields, preserve module and mainboard firmware separately, and never manufacture missing sensor values or owner data.

- [ ] **Step 4: Implement device API functions**

```ts
export async function getDevices(
  filters: DeviceListFilters,
  signal?: AbortSignal,
): Promise<PageResponse<Device>>

export async function getDevice(
  deviceId: string,
  signal?: AbortSignal,
): Promise<Device>
```

Serialize only non-empty filters. Parse responses with Zod. Convert schema failures to `ApiError('invalidResponse', ...)` with safe issue details.

- [ ] **Step 5: Implement query option factories**

Create stable hierarchical keys under `['devices']`. Use TanStack `queryOptions` for list and detail and pass QueryFunctionContext signal to the API functions.

- [ ] **Step 6: Create deterministic mock data and handlers**

Create at least 36 devices across three models, three statuses, and multiple Vietnamese regions so every filter and pagination state is observable. Handlers apply search, status, model, region, page, and page size. Read the validated mock role and omit owner fields for warehouse/production and read-only roles. Return 404 for unknown IDs. In development mock mode, support `mock_error=500` on list and detail requests to return a deterministic server error for manual verification; application navigation must never add this parameter automatically.

- [ ] **Step 7: Initialize the browser worker**

Export `worker = setupWorker(...handlers)` and run `pnpm exec msw init public --save` to generate `public/mockServiceWorker.js`.

- [ ] **Step 8: Verify and commit**

Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`; all must pass.

```bash
git add src/features/devices src/mocks public/mockServiceWorker.js package.json pnpm-lock.yaml
git commit -m "feat: add typed device api and mocks"
```

### Task 6: Build the device list and detail vertical slice

**Files:**
- Create: `src/features/devices/components/DeviceFilters.tsx`
- Create: `src/features/devices/components/DeviceTable.tsx`
- Create: `src/features/devices/components/DeviceOverview.tsx`
- Create: `src/features/devices/pages/DeviceListPage.tsx`
- Create: `src/features/devices/pages/DeviceDetailPage.tsx`
- Create: `src/routes/_authenticated/devices/index.tsx`
- Create: `src/routes/_authenticated/devices/$deviceId.tsx`
- Modify: `src/routes/_authenticated/index.tsx`
- Regenerate: `src/routeTree.gen.ts`

**Interfaces:**
- Consumes: device models and query factories, `PermissionGuard`, page-state components, router navigation, and router search parameters.
- Produces: `/devices` list route and `/devices/$deviceId` detail route.

- [ ] **Step 1: Define and validate device-list URL state**

The list route validates defaults and ranges with Zod: empty `search`, optional `status/model/region`, `page` default `1`, and `pageSize` default `20` limited to `10 | 20 | 50`. Its loader ensures `deviceQueries.list(search)` data. Guard the route with `device.read`; unauthorized access redirects to `/403`.

- [ ] **Step 2: Implement URL-backed filter controls**

Render Ant Design search and select controls for status, model, and region. Updates navigate with merged typed search parameters and reset `page` to `1`. Provide a reset action that returns to defaults. Do not maintain a second authoritative filter state in component state.

- [ ] **Step 3: Implement the device table**

Render serial, model, region, status, last online, module firmware, and mainboard firmware. Use `StatusTag`, format dates safely, and navigate row/detail actions to the typed device detail route. Drive Ant Design pagination from URL state and total response count.

- [ ] **Step 4: Implement the list page**

Use the route search object and `useSuspenseQuery(deviceQueries.list(filters))`. Compose `PageHeader`, filters, table, and loading/error/empty states. Add an Export button inside `PermissionGuard capability="device.export"`; the button shows a clear “not implemented in base” info message rather than performing an export.

- [ ] **Step 5: Implement detail routing and page**

The route loader ensures `deviceQueries.detail(params.deviceId)`. The page renders identity, connection state, owner when returned, separate firmware versions, and available telemetry. Use `PermissionGuard capability="device.command"` for a disabled or informational remote-command action. A 404 renders the not-found state; other failures render retryable API error feedback.

- [ ] **Step 6: Complete navigation and route generation**

Make the authenticated index redirect to `/devices`. Generate the route tree via Vite and ensure shell breadcrumbs derive meaningful labels for list and detail routes.

- [ ] **Step 7: Verify all six RBAC paths manually**

Run `pnpm dev` and exercise each mock role:

1. Every role can open device list/detail.
2. Warehouse/production and read-only payloads contain no owner data.
3. Only mapped roles see Export.
4. Only administrator and technical operations see the command action.
5. Direct anonymous access redirects to login and returns to the requested URL after sign-in.
6. Unknown device IDs and unknown routes show the correct state.

- [ ] **Step 8: Run quality gates and commit**

Run `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build`; all must exit successfully.

```bash
git add src/features/devices src/routes src/routeTree.gen.ts src/shared/components/AppShell.tsx
git commit -m "feat: add device management vertical slice"
```

### Task 7: Harden documentation and final production behavior

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`
- Modify: any implementation file identified by final lint/type/build/manual checks.

**Interfaces:**
- Consumes: the completed application.
- Produces: documented setup and verified production artifact.

- [ ] **Step 1: Document developer setup**

Rewrite README with prerequisites, `pnpm install`, environment setup, mock-mode commands, real API configuration, available scripts, architecture boundaries, capability conventions, and a checklist for adding a feature. State explicitly that backend authorization remains authoritative and automated tests are deferred.

- [ ] **Step 2: Harden ignored files**

Ignore `node_modules`, `dist`, local `.env*` files while preserving `.env.example`, Vite caches, editor metadata, and OS files. Do not ignore generated `src/routeTree.gen.ts` or `public/mockServiceWorker.js`.

- [ ] **Step 3: Prove mock code is excluded from production startup**

Run `pnpm build`. Inspect the production output names and source strings with:

```bash
rg -n "Mock Service Worker|setupWorker|mockServiceWorker" dist || true
```

Expected: no executable MSW browser setup in the application JavaScript chunks. The static service-worker file may exist under `dist` because it is copied from `public`, but production startup must never register it.

- [ ] **Step 4: Run the complete quality gate**

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
git diff --check
```

Expected: every command exits with code `0` and the build produces `dist`.

- [ ] **Step 5: Review repository scope**

Run `git status --short` and `git diff --stat`. Confirm `PORTAL_FUNCTIONAL_SPEC.html` remains unmodified/untracked and is not staged. Confirm there are no Vitest, React Testing Library, `*.test.*`, `*.spec.*`, or `tests/` additions.

- [ ] **Step 6: Commit documentation and final hardening**

```bash
git add README.md .gitignore package.json pnpm-lock.yaml src public vite.config.ts
git commit -m "docs: document portal frontend foundation"
```

Only add implementation paths that actually changed. Never add `PORTAL_FUNCTIONAL_SPEC.html`.

---

## Final Acceptance Checklist

- [ ] Mock login works for all six business roles.
- [ ] Capability checks protect menu, route, and action layers without role-name checks in components.
- [ ] Device filters and pagination are encoded in validated URL search parameters.
- [ ] Device DTOs are validated and mapped before use by UI components.
- [ ] Warehouse/production and read-only mock responses omit owner PII.
- [ ] Device detail distinguishes module and mainboard firmware.
- [ ] Loading, empty, retryable error, forbidden, and not-found states are visible.
- [ ] Mock and real API modes switch through environment configuration.
- [ ] Production startup does not register MSW.
- [ ] No automated test framework or test files were introduced.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build` pass.
- [ ] README explains setup and feature conventions.
