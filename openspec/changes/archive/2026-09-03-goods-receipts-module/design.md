## Context

The database migration already defines `goods_receipts` and `gr_lines`; PO lines maintain `qty_received`, and PR lines maintain a denormalized `qty_received`. The backend currently exposes PO open lines, uses service-owned validation and transactions, and registers route modules in `backend/src/app.js`. The Vue application has equivalent PO list/create/detail pages and an API-client module, but has no GR routes or navigation. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Complete the workshop's PR -> PO -> GR quantity traceability flow without a database migration.
- Keep route handlers thin and place GR validation, queries, mapping, and transactions in one focused service module.
- Match the current REST response and error conventions so GR pages can reuse PO UI patterns.

**Non-Goals:**
- Inventory ledgers, supplier delivery documents, partial-line editing, receipt cancellation, or payment integration.
- Changes to PR or PO creation/approval behavior.
- Generalized allocation splitting beyond the existing PO model, where one PO line is created from one PR-line allocation.

## Decisions

### Add a dedicated Goods Receipt service and route module

The module will expose list, create, detail, and post operations through `/api/goods-receipts`, with `POST /:id/post` for the status transition. The service will map database rows to the same camelCase response shape used by the PO service and return `422` validation errors for user-correctable input or state failures. This maintains the existing layer boundaries and gives the frontend a compact API surface.

Alternative considered: extend `purchase-order-service.js` with receipt operations. This would mix PO allocation responsibilities with receipt lifecycle logic and make the workshop module harder to follow.

### Create receipt drafts from submitted PO open lines, then validate again at post time

The create operation will verify a nonempty, well-formed line set that belongs to one SUBMITTED PO and references currently open lines. It will persist the receipt as `DRAFT` without changing received totals. The post operation will lock the receipt, its PO lines, and allocation-backed PR lines, then re-evaluate each open quantity before performing updates. This supports drafting while retaining the correct concurrency guard when multiple receipts could be posted.

Alternative considered: reserve PO quantities at draft creation. This would require a new reservation model and changes to the baseline schema, which is disproportionate for the workshop.

### Update PO and linked PR quantities in the posting transaction

On a valid post, the service will increment `po_lines.qty_received` for each GR line and increment the corresponding `pr_lines.qty_received` through that PO line's allocation record, then mark the receipt `POSTED`. Any validation or database failure will roll the entire transaction back. The existing PO creator makes one PO line per PR allocation, so this direct allocation-chain update preserves the baseline's intended traceability without new allocation rules.

Alternative considered: update quantities with independent statements outside a transaction. That can leave PO, PR, and GR state inconsistent on a failure or concurrent post.

### Mirror PO page structure for GR workflows

The frontend will add a GR list, a creation page initialized from a PO identifier, and a detail page with posting controls for drafts. It will add navigation from the global header and from eligible PO detail pages, reuse the established form/table conventions and CSS variables, and disable creation entry points when a PO has no open lines.

Alternative considered: embed the receipt form inside the PO detail page. A standalone detail URL is already part of the documented GR flow and better supports reviewing a posted record.

## Risks / Trade-offs

- [Two users post receipts for the same PO line concurrently] -> Lock PO lines and validate balances inside the posting transaction.
- [A PO line has no matching allocation source] -> Reject posting with a clear validation error and roll back, preventing untraceable PR totals.
- [Receipt drafts become stale after another receipt posts] -> Show current PO open quantities when loading the form and return a clear 422 error if the final post exceeds the refreshed balance.
- [Number generation based on a count can collide under concurrent creates] -> Retain the current workshop numbering pattern; a database sequence is outside this module's scope.

## Migration Plan

1. No database migration is required because the baseline schema already contains the GR tables and receipt quantity columns.
2. Deploy the route registration, service, frontend pages, and tests together.
3. Roll back application code if necessary; unposted drafts can remain safely in the existing tables, while posted receipts must be retained because they represent received-quantity history.