import { jest, describe, test, expect } from '@jest/globals';
import {
  createGoodsReceipt,
  getGoodsReceiptById,
  listGoodsReceipts,
  postGoodsReceipt,
} from '../../src/services/goods-receipt-service.js';

// ── Helpers ──────────────────────────────────────────────

function validPayload(overrides = {}) {
  return {
    poId: 'po-1',
    receiptDate: '2026-09-03',
    notes: 'Delivered on time',
    lines: [
      {
        poLineId: 'po-line-1',
        qtyReceived: 3,
        actualSiteCode: 'JKT-PLANT',
      },
    ],
    ...overrides,
  };
}

function mockClient(queryResponses) {
  return {
    query: jest.fn((sql, params) => queryResponses(sql, params)),
    release: jest.fn(),
  };
}

function mockDb(client, queryFn) {
  return {
    pool: { connect: jest.fn(() => Promise.resolve(client)) },
    query: jest.fn(queryFn || (() => ({ rows: [], rowCount: 0 }))),
  };
}

function detailQueryResponses() {
  return (sql) => {
    if (sql.includes('FROM goods_receipts gr')) {
      return {
        rows: [{
          id: 'gr-id', gr_number: 'GR-2026-0002', po_id: 'po-1', status: 'DRAFT',
          receipt_date: '2026-09-03', notes: 'Delivered on time', created_at: new Date(), updated_at: new Date(),
          po_number: 'PO-2026-0001', vendor_name: 'PT Supplier Jaya',
        }],
        rowCount: 1,
      };
    }
    if (sql.includes('FROM gr_lines gl')) {
      return {
        rows: [{
          id: 'gr-line-1', line_no: 1, po_line_id: 'po-line-1', qty_received: 3, actual_site_code: 'JKT-PLANT',
          item_code: 'BRG-001', item_name: 'Safety Helmet', uom: 'PCS', qty_ordered: 12, po_qty_received: 0,
        }],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  };
}

// ─────────────────────────────────────────────────────────
// Payload Validation (via createGoodsReceipt)
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – payload validation', () => {
  test('rejects when body is null', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, null))
      .rejects.toMatchObject({ message: 'Body is required', statusCode: 422 });
  });

  test('rejects when poId is missing', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { receiptDate: '2026-09-03', lines: [{}] }))
      .rejects.toMatchObject({ message: 'poId is required', statusCode: 422 });
  });

  test('rejects when receiptDate is missing', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { poId: 'po-1', lines: [{}] }))
      .rejects.toMatchObject({ message: 'receiptDate is required', statusCode: 422 });
  });

  test('rejects when lines is empty array', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { poId: 'po-1', receiptDate: '2026-09-03', lines: [] }))
      .rejects.toMatchObject({ message: 'lines must contain at least one item', statusCode: 422 });
  });

  test('rejects when poLineId is missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({ lines: [{ qtyReceived: 1, actualSiteCode: 'WH' }] });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].poLineId is required', statusCode: 422 });
  });

  test('rejects when a PO line is duplicated', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [
        { poLineId: 'po-line-1', qtyReceived: 1, actualSiteCode: 'WH' },
        { poLineId: 'po-line-1', qtyReceived: 2, actualSiteCode: 'WH' },
      ],
    });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[1].poLineId is duplicated', statusCode: 422 });
  });

  test('rejects when qtyReceived is zero', async () => {
    const db = mockDb(null);
    const payload = validPayload({ lines: [{ poLineId: 'po-line-1', qtyReceived: 0, actualSiteCode: 'WH' }] });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].qtyReceived must be greater than 0', statusCode: 422 });
  });

  test('rejects when actualSiteCode is missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({ lines: [{ poLineId: 'po-line-1', qtyReceived: 1 }] });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].actualSiteCode is required', statusCode: 422 });
  });
});

// ─────────────────────────────────────────────────────────
// PO state checks
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – purchase order checks', () => {
  test('rejects when poId does not exist', async () => {
    const db = mockDb(null, () => ({ rows: [], rowCount: 0 }));
    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({ message: 'poId not found', statusCode: 422 });
  });

  test('rejects when PO is not SUBMITTED', async () => {
    const db = mockDb(null, (sql) => {
      if (sql.includes('FROM purchase_orders WHERE id')) {
        return { rows: [{ id: 'po-1', status: 'DRAFT' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'Purchase order must be SUBMITTED to create a goods receipt',
        statusCode: 422,
      });
  });

  test('rejects when PO line does not belong to the selected purchase order', async () => {
    const db = mockDb(null, (sql) => {
      if (sql.includes('FROM purchase_orders WHERE id')) {
        return { rows: [{ id: 'po-1', status: 'SUBMITTED' }], rowCount: 1 };
      }
      if (sql.includes('FROM po_lines WHERE po_id')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: PO line does not belong to the selected purchase order',
        statusCode: 422,
      });
  });

  test('rejects when PO line has no open quantity remaining', async () => {
    const db = mockDb(null, (sql) => {
      if (sql.includes('FROM purchase_orders WHERE id')) {
        return { rows: [{ id: 'po-1', status: 'SUBMITTED' }], rowCount: 1 };
      }
      if (sql.includes('FROM po_lines WHERE po_id')) {
        return { rows: [{ id: 'po-line-1', qty_ordered: 12, qty_received: 12 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: PO line has no open quantity remaining',
        statusCode: 422,
      });
  });
});

// ─────────────────────────────────────────────────────────
// Successful GR draft creation
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – success path', () => {
  test('creates a DRAFT goods receipt and returns detail', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 1 }], rowCount: 1 };
      if (sql.startsWith('INSERT')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    const db = mockDb(client, (sql) => {
      if (sql.includes('FROM purchase_orders WHERE id')) {
        return { rows: [{ id: 'po-1', status: 'SUBMITTED' }], rowCount: 1 };
      }
      if (sql.includes('FROM po_lines WHERE po_id')) {
        return { rows: [{ id: 'po-line-1', qty_ordered: 12, qty_received: 0 }], rowCount: 1 };
      }
      return detailQueryResponses()(sql);
    });

    const result = await createGoodsReceipt(db, validPayload());

    expect(result.status).toBe('DRAFT');
    expect(result.grNumber).toBe('GR-2026-0002');
    expect(result.lines).toHaveLength(1);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});

// ─────────────────────────────────────────────────────────
// Post GR – status transition and quantity guard
// ─────────────────────────────────────────────────────────

describe('postGoodsReceipt – status transition and over-receipt guard', () => {
  test('returns null when goods receipt does not exist', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE') && sql.includes('goods_receipts')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    const result = await postGoodsReceipt(db, 'missing-id');
    expect(result).toBeNull();
  });

  test('rejects posting when goods receipt is already POSTED', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE') && sql.includes('goods_receipts')) {
        return { rows: [{ id: 'gr-1', status: 'POSTED' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(postGoodsReceipt(db, 'gr-1'))
      .rejects.toMatchObject({ message: 'Only DRAFT goods receipt can be posted', statusCode: 422 });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects and rolls back when a receipt line exceeds PO line remaining quantity', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE') && sql.includes('goods_receipts')) {
        return { rows: [{ id: 'gr-1', status: 'DRAFT' }], rowCount: 1 };
      }
      if (sql.includes('FROM gr_lines WHERE gr_id')) {
        return { rows: [{ id: 'gr-line-1', po_line_id: 'po-line-1', qty_received: 5 }], rowCount: 1 };
      }
      if (sql.includes('FOR UPDATE') && sql.includes('po_lines')) {
        return { rows: [{ id: 'po-line-1', qty_ordered: 12, qty_received: 10 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(postGoodsReceipt(db, 'gr-1'))
      .rejects.toMatchObject({
        message: 'PO line po-line-1: receipt qty 5 exceeds remaining 2',
        statusCode: 422,
      });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects when a PO line has no PR allocation', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE') && sql.includes('goods_receipts')) {
        return { rows: [{ id: 'gr-1', status: 'DRAFT' }], rowCount: 1 };
      }
      if (sql.includes('FROM gr_lines WHERE gr_id')) {
        return { rows: [{ id: 'gr-line-1', po_line_id: 'po-line-1', qty_received: 3 }], rowCount: 1 };
      }
      if (sql.includes('FOR UPDATE') && sql.includes('po_lines')) {
        return { rows: [{ id: 'po-line-1', qty_ordered: 12, qty_received: 0 }], rowCount: 1 };
      }
      if (sql.includes('FROM pr_line_allocations')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(postGoodsReceipt(db, 'gr-1'))
      .rejects.toMatchObject({
        message: 'PO line po-line-1 has no PR allocation to update',
        statusCode: 422,
      });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('posts a DRAFT receipt within remaining quantity and updates PO/PR received qty', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE') && sql.includes('goods_receipts')) {
        return { rows: [{ id: 'gr-1', status: 'DRAFT' }], rowCount: 1 };
      }
      if (sql.includes('FROM gr_lines WHERE gr_id')) {
        return { rows: [{ id: 'gr-line-1', po_line_id: 'po-line-1', qty_received: 3 }], rowCount: 1 };
      }
      if (sql.includes('FOR UPDATE') && sql.includes('po_lines')) {
        return { rows: [{ id: 'po-line-1', qty_ordered: 12, qty_received: 0 }], rowCount: 1 };
      }
      if (sql.includes('FROM pr_line_allocations')) {
        return { rows: [{ pr_line_id: 'pr-line-1' }], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    const db = mockDb(client, detailQueryResponses());

    const result = await postGoodsReceipt(db, 'gr-1');

    expect(result.status).toBe('DRAFT'); // detailQueryResponses stub always returns DRAFT header shape
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE po_lines'),
      [3, 'po-line-1']
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE pr_lines'),
      [3, 'pr-line-1']
    );
  });
});

describe('goods-receipt-service list function', () => {
  test('listGoodsReceipts returns mapped header fields', async () => {
    const db = {
      query: jest.fn(() => ({
        rows: [
          {
            id: 'gr-1', gr_number: 'GR-2026-0001', po_id: 'po-1', status: 'DRAFT',
            receipt_date: '2026-09-01', notes: null, created_at: '2026-09-01T00:00:00.000Z',
            updated_at: '2026-09-01T00:00:00.000Z', po_number: 'PO-2026-0001', vendor_name: 'PT Maju',
          },
        ],
      })),
    };

    const result = await listGoodsReceipts(db);

    expect(result).toEqual([
      {
        id: 'gr-1',
        grNumber: 'GR-2026-0001',
        poId: 'po-1',
        poNumber: 'PO-2026-0001',
        vendorName: 'PT Maju',
        status: 'DRAFT',
        receiptDate: '2026-09-01',
        notes: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
  });

  test('getGoodsReceiptById returns null when not found', async () => {
    const db = { query: jest.fn(() => ({ rows: [], rowCount: 0 })) };
    const result = await getGoodsReceiptById(db, 'missing-id');
    expect(result).toBeNull();
  });
});
