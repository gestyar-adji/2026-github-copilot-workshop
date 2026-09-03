## Why

The procurement flow currently stops after a purchase order is submitted, so the application cannot record delivered quantities or show that ordered goods have been received. Adding Goods Receipts completes the MVP PR -> PO -> GR traceability path using the existing GR database tables.

## What Changes

- Add Goods Receipt list, create, and detail views, including navigation from Purchase Orders to receipt creation.
- Add REST endpoints to list and create receipt drafts, retrieve receipt details, and post a draft receipt.
- Create drafts only from a submitted purchase order's open lines.
- On posting, reject receipt quantities that exceed each PO line's remaining quantity and atomically update the related PO and PR received quantities.
- Enforce the GR status transition `DRAFT -> POSTED`; posted receipts remain read-only.

## Capabilities

### New Capabilities
- `goods-receipts`: Create, view, and post goods receipts against submitted purchase-order lines while maintaining receipt quantity traceability to PO and PR lines.

### Modified Capabilities

- None.

## Impact

- Backend: a Goods Receipt route module and service, registered with the Fastify application; existing PO open-line data will be used as the receipt source.
- Database: existing `goods_receipts`, `gr_lines`, `po_lines`, and allocation tables; no schema migration is expected.
- Frontend: API client, Vue routes and navigation, and Goods Receipt pages/components following the existing PO UI patterns.
- Tests: focused Jest coverage for receipt quantity and status validation, plus Playwright coverage for the PO-to-GR flow.