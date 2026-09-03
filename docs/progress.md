# Project Progress Summary

## Overview
This repository is a workshop project for a small procurement MVP built around the PR -> PO -> GR flow. The implementation is intentionally scoped to teach the full lifecycle in a simple, readable way.

The current codebase already includes:
- Database schema and seed data for the procurement MVP
- Fastify backend with Swagger/OpenAPI registration
- Requisition module baseline (list, create, submit, approve, detail, open-lines)
- PO backend route/service implementation with validation logic and tests
- Vue frontend shell for the dashboard and requisition flows
- A purchase-order create page scaffold and supporting form components

## Implemented modules

### 1) Database and bootstrap
Implemented in:
- `db/migrations/001_init_procurement_mvp.sql`
- `db/seeds/002_seed_procurement_mvp.sql`
- `docker/postgres/init/00-init-mvp-db.sh`

This bootstraps PostgreSQL with the core procurement tables such as:
- `purchase_requisitions`
- `pr_lines`
- `purchase_orders`
- `po_lines`
- `pr_line_allocations`
- `goods_receipts`

### 2) Backend foundation
Implemented in:
- `backend/src/app.js`
- `backend/src/plugins/db.js`

The Fastify app is configured with:
- CORS
- Swagger/OpenAPI
- DB plugin registration
- Requisition and purchase-order route registration
- `/health` endpoint

### 3) Requisition module (baseline)
Implemented in:
- `backend/src/routes/requisition-routes.js`
- `backend/src/services/requisition-service.js`

Available endpoints include:
- `GET /api/requisitions`
- `POST /api/requisitions`
- `POST /api/requisitions/:id/submit`
- `POST /api/requisitions/:id/approve`
- `GET /api/requisitions/:id`
- `GET /api/requisitions/:id/open-lines`

The requisition flow is already working as the workshop baseline and supports draft -> submitted -> approved transitions.

### 4) Purchase Order module (in progress / backend implemented)
Implemented in:
- `backend/src/routes/purchase-order-routes.js`
- `backend/src/services/purchase-order-service.js`
- `backend/tests/services/purchase-order-service.test.js`

The repository already contains PO backend functionality for:
- list purchase orders
- create PO from approved PR lines
- submit a PO
- fetch PO detail
- fetch open PO lines

The PO service includes:
- validation for required request fields
- over-allocation guard against exceeding remaining PR quantity
- approval check on referenced PRs before allocation
- DRAFT -> SUBMITTED transition enforcement
- creation of PO header, lines, and allocation records
- PR line allocation tracking via `pr_lines.qty_allocated`

## Available PO module API endpoints

These are the current PO endpoints available in the Fastify app:

- `GET /api/purchase-orders`
  - Lists all purchase orders
- `POST /api/purchase-orders`
  - Creates a purchase order from approved PR line allocations
- `POST /api/purchase-orders/:id/submit`
  - Submits a draft PO; only `DRAFT` purchase orders are allowed
- `GET /api/purchase-orders/:id`
  - Returns detail for a single PO including lines and allocation metadata
- `GET /api/purchase-orders/:id/open-lines`
  - Returns open lines for a given PO

### PO business rules already enforced
- A PO cannot allocate more quantity than the remaining approved PR quantity.
- The referenced PR must be in `APPROVED` status before PO creation.
- Only `DRAFT` POs can be submitted.
- Allocation records are stored in `pr_line_allocations` and PR lines are updated with denormalized allocation totals.

## Frontend status
Implemented in:
- `frontend/src/App.vue`
- `frontend/src/router/index.js`
- `frontend/src/pages/DashboardPage.vue`
- `frontend/src/pages/PurchaseOrderCreatePage.vue`
- `frontend/src/components/PurchaseOrderHeaderForm.vue`
- `frontend/src/components/LineAllocationTable.vue`

Current UI state:
- Dashboard and requisition flows exist.
- A purchase-order create page exists as a scaffold/mock form.
- The page validates selected lines and displays total estimated value.
- It is not yet wired to the real PO backend API in a fully integrated flow.
- PO list/detail pages are not fully implemented in the current frontend routing.

## Testing status
Implemented tests include:
- `backend/tests/services/purchase-order-service.test.js`
- Frontend tests for form/page behavior under `frontend/src/components` and `frontend/src/pages`

The backend PO tests cover:
- validation failures
- over-allocation guard
- PR approval status checks
- successful creation flow
- submit status transition behavior

## Current project status
The repository is in an active workshop state:
- PR baseline is complete and working as the starting point.
- PO backend logic is substantially implemented and aligned to the workshop plan.
- PO frontend integration is partial and mostly scaffolded rather than end-to-end completed.
- GR module remains outside the implementation scope for this workshop.

## Recommended next steps
1. Complete PO list/detail UI pages and route wiring.
2. Connect the frontend create page to `POST /api/purchase-orders`.
3. Add PO submit flow from the UI to `POST /api/purchase-orders/:id/submit`.
4. Add end-to-end Playwright validation focused on the PO flows.
5. Leave GR for the post-workshop extension.
