## 1. Goods Receipt Backend

- [x] 1.1 Add a Goods Receipt service with list, detail, and draft-creation operations that map records to the existing camelCase API shape; verify focused Jest tests cover successful list, detail, and draft creation.
- [x] 1.2 Validate GR creation payloads, including required purchase order, receipt date, positive line quantities, receiving site, unique PO lines, submitted PO status, and PO-line ownership; verify invalid cases return 422 and persist no draft.
- [x] 1.3 Implement transactional GR posting that locks the receipt and its PO/PR source lines, rejects over-receipt, increments PO and linked PR received quantities, and transitions DRAFT to POSTED; verify Jest tests cover success, rollback on over-receipt, and rejection of an already posted receipt.
- [x] 1.4 Add and register Goods Receipt REST routes for list, create, detail, and post, using established 404 and 422 response conventions; verify the endpoints appear in the Fastify API and return the specified responses.

## 2. Goods Receipt Frontend

- [x] 2.1 Extend the shared API client and router with Goods Receipt list, create, detail, and post operations; verify route navigation and API client calls use the GR REST paths.
- [x] 2.2 Build a Goods Receipt list page and global navigation entry using the existing PO page layout and shared CSS variables; verify users can open a receipt detail from the list.
- [x] 2.3 Build a GR creation page preselected from an eligible submitted PO, showing open lines, receipt quantities, actual sites, receipt date, notes, validation feedback, and post-create navigation; verify the form creates a DRAFT receipt from valid PO lines.
- [x] 2.4 Update PO detail with a receipt-creation action only when the PO is submitted and has open lines, then build the GR detail page with header, line quantities, and a DRAFT-only post action; verify the action is absent for fully received POs and a successful post refreshes the displayed status and quantities.

## 3. Integration Verification

- [x] 3.1 Add focused Vue component/page tests for GR list rendering, create-form validation, and DRAFT-only posting controls; verify `npm.cmd test` passes in `frontend`.
- [x] 3.2 Add a Playwright PR -> PO -> GR journey that creates a receipt from an approved and submitted procurement chain, posts it, and asserts the receipt detail; verify `npm.cmd run test:e2e` passes from the repository root.
- [x] 3.3 Run backend Jest tests and the full frontend build after the GR changes; verify `npm.cmd test` in `backend` and `npm.cmd run build` in `frontend` complete successfully.