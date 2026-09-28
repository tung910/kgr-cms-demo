# CMS Portal Base Design

**Date:** 2026-09-10  
**Status:** Approved for implementation planning

## 1. Purpose

Build the frontend foundation for the KGR Ecosystem administration portal described in `PORTAL_FUNCTIONAL_SPEC.html`. This phase establishes reusable application architecture and delivers one representative vertical slice for device management. It does not implement the full portal scope.

The base must support future modules such as alerts, customers, warranties, firmware, inventory, commerce, reporting, and system administration without introducing micro-frontend complexity at this stage.

## 2. Scope

### Included

- React, TypeScript, and Vite application foundation.
- Feature-first modular-monolith structure.
- TanStack Router with type-safe, file-based routes and validated search parameters.
- TanStack Query server-state foundation.
- Ant Design component system with theme tokens.
- Tailwind CSS for layout, responsive behavior, spacing, and custom presentation.
- Mock authentication and capability-based RBAC for the six business roles in the functional specification.
- API client abstraction, typed contracts, Zod boundary validation, DTO-to-domain mapping, and normalized errors.
- MSW-backed mock API for authentication, permissions, device list, and device detail.
- Application shell and a device-management vertical slice.
- ESLint, Prettier, strict TypeScript, environment validation, and production build checks.
- README guidance for setup, mock mode, environment configuration, and adding a feature.

### Excluded

- A real SSO integration or backend authorization.
- Live device commands, OTA workflows, exports, and other complete business modules.
- Micro-frontends.
- Vitest, React Testing Library, test files, and feature `tests/` directories.
- A mobile-first experience; the portal is desktop-first, while remaining usable on tablets.

## 3. Architecture

Use a feature-first modular monolith. Business modules own their API calls, query definitions, schemas, models, pages, and feature-specific components. Cross-cutting application infrastructure belongs to `core`; reusable presentation and utilities belong to `shared`.

```text
src/
  app/
    providers/
    router/
    styles/
  core/
    api/
    auth/
    permissions/
    config/
  features/
    devices/
      api/
      components/
      model/
      pages/
      queries/
      schemas/
  routes/
  shared/
    components/
    hooks/
    lib/
    types/
  mocks/
```

Dependencies flow inward as follows:

- `shared` must not import from `features`.
- `core` must not depend on a business feature.
- A feature may use `core` and `shared`.
- Route files declare URLs, validation, guards, and lazy loading, but render pages and reuse query options owned by the relevant feature.
- Feature internals must not expose Axios-specific types.

This boundary keeps each module independently understandable and lets future modules follow the device slice as a reference implementation.

## 4. Technology Decisions

- **React + TypeScript + Vite:** application runtime and build tooling.
- **TanStack Router:** type-safe routing, typed search parameters, route guards, and route-level prefetching.
- **TanStack Query:** server-state cache, loading/error state, request cancellation, prefetching, and mutation invalidation.
- **Ant Design:** tables, forms, controls, modal interactions, navigation, feedback, and other enterprise UI primitives.
- **Tailwind CSS:** page layout, responsive behavior, spacing, and bespoke presentation. Tailwind must not deeply override Ant Design internals.
- **Axios behind `ApiClient`:** HTTP transport. Features consume transport-neutral methods, normalized results, `AbortSignal`, and `ApiError` rather than Axios types.
- **Zod:** environment, route-search, and API-boundary validation.
- **MSW:** development mock server using the same frontend contracts as a future backend.
- **React Hook Form:** permitted only for complex or schema-heavy forms. Straightforward Ant Design CRUD forms use Ant Design Form. A form must not combine both state systems.

## 5. Data Flow

The device-list flow is:

```text
URL search parameters
  -> route validation
  -> feature-owned TanStack Query options
  -> device API function
  -> transport-neutral ApiClient
  -> MSW or real backend
  -> Zod DTO validation
  -> DTO-to-domain mapper
  -> page and components
```

Search text, filters, page number, and page size live in the URL. Reloading or sharing the URL therefore preserves list state. The route loader prefetches the same query options consumed by the page, preventing duplicate query definitions and unnecessary requests.

Device API payloads are modeled separately from UI domain models. External responses are validated at the API boundary and mapped before entering components. The application must not assume that a successful HTTP response has a valid payload.

Query options factories own query keys, query functions, and stable configuration. Mutations invalidate only the relevant query scopes. Requests accept an `AbortSignal` so navigation can cancel obsolete work.

## 6. API Foundation and Error Handling

`ApiClient` provides typed transport-neutral request methods and produces a normalized `ApiError`. It supports environment-configured base URLs, request cancellation, authentication headers through an adapter, and consistent response handling.

The shared error model covers:

- authentication failure;
- authorization failure;
- not found;
- request validation errors;
- network failures;
- backend/system failures;
- invalid response payloads.

Behavior is standardized:

- A `401` expires the mock session and returns the user to login.
- A `403` produces a dedicated forbidden page or contextual denial message.
- List-query failures render an error state with an explicit retry action.
- Mutation failures preserve user input and show actionable feedback.
- Client errors are not retried automatically.
- Only safe network and selected server failures receive a small bounded retry count.
- Sensitive mutations never retry automatically.
- Route-level error boundaries prevent a feature failure from breaking the entire shell.

Environment validation fails early when required configuration is invalid. Development can switch between MSW and a real API without changing feature code. Mock-only setup must not be included in the production bundle.

## 7. Authentication and Authorization

Mock authentication supports these six roles from the functional specification:

1. System administrator.
2. Technical operations.
3. Customer service.
4. Warehouse and production.
5. Business.
6. Read only.

Roles are mapped to capabilities such as:

- `device.read`;
- `device.view_owner`;
- `device.export`;
- `device.command`.

Components and routes check capabilities, never role names. `PermissionGuard` applies the same capability model to routes, menu items, and actions. The mock user menu allows role switching so each authorization path can be exercised during development.

Mock responses remove protected PII for roles without permission rather than sending full PII and merely hiding it in the component. This demonstrates the required security boundary. Frontend guards remain an interface and UX mechanism; the future backend is authoritative for real access control.

The authentication contract is adapter-based so mock authentication can later be replaced by KGR SSO without restructuring features.

## 8. Application Shell

The shell contains:

- a responsive sidebar whose items are filtered by capability;
- a header and user menu;
- breadcrumbs;
- the main content region;
- route-level loading and error presentation;
- dedicated forbidden and not-found pages;
- a logout action and mock-role switcher.

Ant Design theme tokens define the initial visual system. Tailwind handles macro layout, spacing, responsive changes, and custom containers. Reusable portal primitives such as page headers, status tags, permission guards, and data-display states live in `shared` only after they are genuinely reused or form part of the application-wide contract.

## 9. Device Vertical Slice

The device slice is the reference pattern for future business modules.

### Device list

- Server-side pagination.
- Search by supported device identifiers.
- Filters for status, model, and region.
- Search and pagination state synchronized to validated URL parameters.
- Loading, empty, error, and retry states.
- Navigation to device detail.
- At least one capability-protected action to demonstrate RBAC.

### Device detail

- Device identity and model.
- Connection state and last-online information.
- Owner information only when `device.view_owner` is granted.
- Separate module and mainboard firmware versions.
- Latest representative telemetry.
- Clear loading, missing-record, invalid-response, and API-failure states.

The slice does not execute real remote commands, firmware updates, or exports. It defines only the API and permission seams required for those capabilities to be implemented later.

## 10. Development Standards

- TypeScript strict mode is mandatory.
- Import aliases must be configured consistently in TypeScript and Vite.
- Routes and feature pages use lazy loading where appropriate.
- Accessibility basics include semantic structure, labeled controls, keyboard-operable actions, and visible feedback.
- Linting, formatting, type checking, and production builds are the initial quality gates.
- Required scripts are `dev`, `build`, `preview`, `lint`, `typecheck`, and `format`.
- Automated test dependencies and test files are intentionally deferred from this base.

## 11. Completion Criteria

The foundation is complete when:

1. The application can sign in using mock accounts representing all six roles.
2. Menu items, direct routes, and actions respect mapped capabilities.
3. The device list supports URL-synchronized search, filters, and server-side pagination.
4. A user can open device detail and see owner PII only when permitted.
5. Loading, empty, forbidden, not-found, invalid-response, and API-error states are represented clearly.
6. The application switches between MSW and an environment-configured API base URL without feature changes.
7. Mock code is excluded from the production bundle.
8. ESLint, TypeScript type checking, and the production build succeed.
9. The repository contains no Vitest or React Testing Library dependency and no test files introduced by this phase.
10. README documentation explains setup, environment configuration, mock mode, and the feature-module conventions.

## 12. Deferred Decisions

The following are deliberately deferred until the corresponding integration or feature is designed:

- KGR SSO protocol and token/session lifecycle details.
- Backend endpoint URLs and exact response envelopes.
- The complete approved permission matrix for all portal functions.
- Detailed device-command, OTA, export, and audit workflows.
- Final brand-specific UI design.
- Automated testing strategy and framework adoption.

These deferred items do not block the base because they are isolated behind authentication, permission, API, and UI-theme boundaries.
