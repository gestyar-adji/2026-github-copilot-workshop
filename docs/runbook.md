# Procurement MVP Runbook

## Scope

This runbook is the execution checklist for the workshop MVP. Implementation work is focused on the Purchase Order (PO) backlog only.

In scope:
- PO list, create, and detail pages
- PO REST integration from the frontend
- PO submit flow
- PO quantity allocation validation
- Focused Jest and Playwright checks for PO behavior

Out of scope:
- Goods Receipt (GR) implementation
- Enterprise workflow, SSO, reporting, notifications, and advanced compliance
- Broad refactors unrelated to the PO backlog

## Strict Task Sequence

### 1. Baseline Verification

Actions:
- Start the PostgreSQL database from Docker.
- Confirm the migration and seed scripts are applied by the Docker init flow.
- Run the existing backend test suite before making implementation changes.

Commands:

```bash
docker compose down -v
docker compose up -d db
cd backend
npm test
```

Checkpoint:
- Existing PR and PO backend tests pass.
- The PO service tests cover over-allocation and status transition behavior.

### 2. Backend Contract Confirmation

Actions:
- Confirm `backend/src/plugins/db.js` exposes the database APIs used by PO services.
- Confirm the Fastify app registers the PO routes.
- Confirm the PO endpoints match the API contract in `docs/plan.md`.

Required PO endpoints:
- `GET /api/purchase-orders`
- `POST /api/purchase-orders`
- `POST /api/purchase-orders/:id/submit`
- `GET /api/purchase-orders/:id`
- `GET /api/purchase-orders/:id/open-lines`

Checkpoint:
- No backend redesign is needed before frontend integration.
- If a route or plugin contract is missing, fix that wiring before moving to frontend work.

### 3. Frontend PO API Helpers

Actions:
- Extend `frontend/src/api.js` with PO helper functions.
- Reuse the existing `apiFetch` pattern for request and error handling.

Required helpers:
- `listPurchaseOrders()`
- `createPurchaseOrder(payload)`
- `getPurchaseOrder(id)`
- `submitPurchaseOrder(id)`
- `getPurchaseOrderOpenLines(id)`

Checkpoint:
- Each helper maps directly to one backend PO endpoint.
- Error handling remains consistent with existing PR API helpers.

### 4. PO Route Registration

Actions:
- Add frontend routes for PO list, PO create, and PO detail pages in `frontend/src/router/index.js`.
- Match the route style used by the existing PR pages.

Required pages:
- PO list page
- PO create page
- PO detail page

Checkpoint:
- The browser can navigate to the PO list, create, and detail routes without router errors.

### 5. PO List Page

Actions:
- Create the PO list page using the PR list page as the local template.
- Show PO number, vendor name, status, created date, and a detail action.
- Provide a clear create-PO action.
- Include loading, empty, and error states consistent with the baseline UI.

Checkpoint:
- The page loads purchase orders from `GET /api/purchase-orders`.
- Users can navigate from the list page to PO create and PO detail.

### 6. PO Create Page

Actions:
- Create the PO create page using the PR create page as the local form template.
- Load approved PR open lines from the requisition open-lines endpoint.
- Capture vendor name.
- Allow users to select one or more PR open lines.
- Capture order quantity and unit price for each selected line.

Required validations:
- Vendor name is required.
- At least one PR line must be selected.
- Ordered quantity must be greater than zero.
- Ordered quantity must be less than or equal to the PR line remaining quantity.

Checkpoint:
- Valid creation calls `POST /api/purchase-orders` and redirects to PO detail.
- Over-allocation is blocked in the UI.
- Server validation errors are displayed clearly if returned.

### 7. PO Detail Page

Actions:
- Create the PO detail page using the PR detail page as the local action/status template.
- Show PO header, status, vendor name, PO number, and line details.
- Show ordered quantity, received quantity, and open quantity for each line.
- Show the submit action only when the PO status is `DRAFT`.

Checkpoint:
- Detail loads from `GET /api/purchase-orders/:id`.
- Submit calls `POST /api/purchase-orders/:id/submit`.
- The page refreshes or updates to show `SUBMITTED` after submit.

### 8. Dashboard Navigation

Actions:
- Add or confirm PO navigation from the dashboard/home page.
- Keep visual styling consistent with the baseline CSS variables and page layout.
- Do not add GR implementation while adding navigation.

Checkpoint:
- A participant can start from the dashboard and reach the PO list page without typing a URL.

### 9. Backend Regression Check

Actions:
- Re-run backend Jest tests after any backend contract or route changes.
- If only frontend files changed, run this before starting E2E work as a regression gate.

Command:

```bash
cd backend
npm test
```

Checkpoint:
- PO allocation tests remain green.
- PO submit status transition tests remain green.
- PR baseline tests remain green.

### 10. Manual Integrated PO Flow

Actions:
- Start the database, backend, and frontend.
- Use the app to navigate through the PO workflow.

Manual flow:
1. Open the dashboard.
2. Navigate to PO list.
3. Open PO create.
4. Select an approved PR open line.
5. Enter a valid ordered quantity.
6. Create the PO.
7. Confirm the PO detail page loads.
8. Submit the PO.
9. Confirm the status changes to `SUBMITTED`.

Checkpoint:
- The PO can be created from approved PR open lines.
- `pr_lines.qty_allocated` is updated by the backend service.
- The PO detail page shows the expected header, status, and line quantities.

### 11. Playwright PO Flow

Actions:
- Add a focused Playwright test under `tests/e2e`.
- Prefer seeded approved PR data if the seed is reliable.
- If the seed does not contain suitable data, create and approve a PR during test setup before creating the PO.

Required E2E assertions:
- PO create page can load approved PR open lines.
- A valid PO can be created.
- The created PO detail page renders line data.
- A draft PO can be submitted.
- Submitted status is visible after submit.

Command:

```bash
npm run test:e2e
```

Checkpoint:
- The focused PO Playwright test passes against local PostgreSQL, Fastify, and Vue.

### 12. Documentation Alignment

Actions:
- Update `docs/plan.md` only if implementation status or run commands have changed.
- Keep the MVP boundary explicit: PR baseline is prebuilt, PO is the backlog implementation, GR is further exploration.

Checkpoint:
- `docs/plan.md`, this runbook, the implemented UI, API behavior, and tests all describe the same PO-focused MVP.

## Final Done Criteria

The PO backlog is done when:
- PO list, create, and detail pages are implemented.
- PO frontend routes and API helpers are wired.
- PO creation enforces allocation quantity rules.
- PO submit transitions `DRAFT` to `SUBMITTED`.
- Backend Jest checks pass.
- A PO-focused Playwright flow passes.
- GR remains outside the implementation scope.
