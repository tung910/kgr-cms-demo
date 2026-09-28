# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, and TypeScript internal CMS portal. Keep application
composition in `src/app`, shared infrastructure in `src/core`, and reusable,
feature-neutral UI and utilities in `src/shared`. Implement product work as
vertical slices under `src/features/<feature>/` (for example,
`devices/api`, `devices/components`, and `devices/pages`). Routes and validated
URL search state live in `src/routes`; do not edit the generated
`src/routeTree.gen.ts`. Development-only MSW handlers and fixtures belong in
`src/mocks` and `src/features/*/mocks`; static worker assets remain in `public/`.

## Business Domain Context

This portal is the internal backoffice for the KGR IoT ecosystem (water
purifiers today; water heaters, freezers, and other appliance lines planned on
the same platform). It is not a generic content CMS — it operates a fleet of
IoT devices at scale (design target: 100k+ devices and serial records) and is
the direct counterpart to the OneKangaroo end-user mobile app: most
configuration changes made here (products, error codes, warranty policy, water
map thresholds, promotions) must propagate to the app within minutes without a
new app release.

Six internal roles use the portal: system admin, technical operations,
customer care, warehouse/production, sales, and view-only. Missing capability
means the feature is hidden, not merely disabled, and customer PII must be
masked per role consistently across the UI, exported files, and the API (Nghị
định 13/2023/NĐ-CP compliance).

Core business domains implemented here, referenced by their spec section
codes (`POR-xxx`):

- **Device fleet & diagnostics** — device registry, live telemetry, remote
  diagnostics, remote control (always logged with an actor and a reason).
- **Alert center** — fleet-wide alerts keyed to the shared error-code table
  (`ER00051`–`ER00074` and beyond), assignment, and SLA countdown/escalation.
- **Filter serial & anti-counterfeit** — serial generation/ingestion,
  validation, signed one-time reset commands, batch recall.
- **Electronic warranty** — auto-issued on first cloud connection, a 5-state
  ticket lifecycle, policy configurable per model/batch, public serial lookup.
- **Water map & analytics** — finer-grained admin view than the app, raw data
  export, sensor-quality filtering rules.
- **Firmware & OTA** — signed firmware store, grouped rollout, progressive
  rollout with automatic halt on error-rate threshold, separate module vs.
  mainboard firmware tracks.
- **Reporting & integration** — operational/business reports, Open API,
  outbound webhooks to CRM/ERP/call-center systems.
- **Customer & account management** — customer profiles, ownership transfer,
  account lock/unlock, loyalty points, targeted push campaigns.
- **Field service** — technician roster, SLA escalation, appointment
  scheduling, cross-system service history, satisfaction surveys.
- **E-commerce counterpart** — storefront catalog, orders, promotions, and the
  model-to-compatible-filter mapping the app uses to recommend the right SKU.
- **Inventory & supply chain**, **device/sales maps**, and **R&D durability
  analytics** (MTBF by product line/batch/component, self-recovery rate,
  pre/post-OTA failure comparison).
- **Platform, security & ops** — multi-industry (multi-tenant) support so a
  new product line or model can go live end-to-end in about a day through
  configuration alone, global search, mandatory 2FA/SSO for admins, and the
  single shared error-code mapping used by firmware, app, and portal alike.

Cross-cutting rules that apply to nearly every feature here: prefer
configuration over hard-coding (new models, industries, alert rules, warranty
policies, and error codes must be addable from the UI and take effect within
minutes); every state-changing action, remote device command, and sensitive
operation (ownership transfer, account lock, filter reset, remote power-off,
resuming a halted OTA campaign) needs an immutable audit entry (actor,
timestamp, target, before/after values, reason) that cannot be edited or
deleted from the UI; and any command capable of powering off a device must be
gated by configurable business conditions rather than executing unconditionally.

The authoritative source for exact acceptance criteria, section numbering, and the permission matrix
is `docs/CMS_QnA_V1_SPEC.md` — consult it (see AI Task Preparation below)
rather than inferring thresholds, percentages, or timing requirements.

## Build, Lint, and Development Commands

Use Node.js 24+ and pnpm 10+.

- `pnpm install` installs the lockfile-pinned dependencies.
- `cp .env.example .env.local` creates local, ignored configuration.
- `pnpm dev` starts the Vite development server; mock mode is enabled by the
  example environment.
- `pnpm build` type-checks and creates the production output in `dist/`.
- `pnpm preview` serves that production build locally.
- `pnpm lint`, `pnpm typecheck`, and `pnpm format:check` are required checks;
  use `pnpm format` to apply formatting.

## Coding Style & Architecture

Write TypeScript with two-space indentation, single quotes, and semicolons;
Prettier enforces these defaults and ESLint covers TypeScript and React Hooks.
Use PascalCase for React components and pages, camelCase for functions and
variables, and descriptive feature folders. Parse external API DTOs with Zod at
the API boundary, map them before rendering, and keep route filters and
pagination in validated route search parameters. Check named capabilities (for
example, `device.read`) via `hasCapability` or `PermissionGuard`; never branch
on role names in UI or routes.

Shared enumerations (statuses, types, and similar fixed value sets used by more
than one screen) belong in `src/shared/constants/<name>.ts` (feature-only sets
stay in the feature slice). Define them once as an ordered `as const` array of
`{ value, labelKey }`, derive the TypeScript type from that array, and keep
labels as i18n keys in the `common` namespace, translated at render time
(`t(labelKey, { ns: 'common' })`). Never store translated text in a constant or
hand-write the same value list/label mapping in a component; see
`src/shared/constants/connectionStatus.ts`.
See `docs/CODING_CONVENTIONS.md` for the full, authoritative ruleset
(architecture boundaries, API/data patterns, Ant Design/Tailwind usage).

## AI Task Preparation

Before planning, editing, or suggesting a change, first read the relevant
context: `README.md`, this guide, and `docs/CODING_CONVENTIONS.md`; then inspect
the target file, its direct imports/consumers, and the matching feature slice.
When building or replacing a screen, follow the step-by-step checklist in
`docs/SCREEN_WORKFLOW.md`.
For work involving business behavior or access, also consult
`docs/CMS_QnA_V1_SPEC.md` and `src/core/permissions/capabilities.ts`.

Use `rg` to locate related code and existing conventions before creating files
or abstractions. Confirm whether a route, schema, mapper, query factory, shared
component, or mock already exists, and extend it when appropriate. Review
`package.json` before adding dependencies. Preserve generated files and
unrelated uncommitted changes; never infer missing business rules—record them as
an assumption or request clarification when they would alter authorization,
PII, or an external API contract.

## Testing Guidelines

Automated test tooling is not yet configured. Do not add a test framework or
test files without a planned change. For every change, run `pnpm lint`,
`pnpm typecheck`, `pnpm format:check`, and `pnpm build`; manually exercise the
affected flow with MSW enabled when relevant.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style, such as `docs: add cms portal
base design`; use focused scopes and imperative summaries. Keep commits small.
PRs should explain the change and its user impact, link the relevant issue or
specification, list verification commands, and include screenshots for visible
UI changes. Never commit `.env.local` or client-exposed secrets.
