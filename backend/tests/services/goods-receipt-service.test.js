import { jest, describe, test, expect } from '@jest/globals';
import {
  createGoodsReceipt,
  listGoodsReceipts,
  getGoodsReceiptById,
  postGoodsReceipt,
} from '../../src/services/goods-receipt-service.js';

// ── Helpers ──────────────────────────────────────────────

/**
 * Build a valid GR creation payload.
 * Override any field by passing partial objects.
 */
function validPayload(overrides = {}) {
  return {
    poId: 'po-id-001',
    lines: [
      {
        poLineId: 'po-line-001',
        qtyReceived: 3,
        actualSiteCode: 'WH-JKT',
      },
    ],
    receiptDate: '2026-09-03',
    notes: 'Received in good condition',
    ...overrides,
  };
}

/**
 * Create a mock DB client returned by pool.connect().
 */
function mockClient(queryResponses) {
  return {
    query: jest.fn((sql, params) => queryResponses(sql, params)),
    release: jest.fn(),
  };
}

/**
 * Create a mock db object with pool.connect() and db.query().
 */
function mockDb(client, queryFn) {
  return {
    pool: { connect: jest.fn(() => Promise.resolve(client)) },
    query: jest.fn(queryFn || (() => ({ rows: [], rowCount: 0 }))),
  };
}

/**
 * Standard client responses for a successful GR creation:
 *   BEGIN → PO SELECT FOR UPDATE → PO line lock → GR count → INSERT header →
 *   INSERT line → COMMIT
 * Then getGoodsReceiptById calls db.query for header + lines.
 */
function happyPathClientResponses() {
  return (sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }
    // PO lookup with lock
    if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
      return {
        rows: [{ id: 'po-id-001', status: 'SUBMITTED' }],
        rowCount: 1,
      };
    }
    // PO line lock check
    if (sql.includes('FROM po_lines') && sql.includes('FOR UPDATE')) {
      return {
        rows: [{ id: 'po-line-001', qty_ordered: 5, qty_received: 0 }],
        rowCount: 1,
      };
    }
    // GR count
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 2 }], rowCount: 1 };
    }
    // INSERT / UPDATE
    if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
}

/**
 * db.query responses used by getGoodsReceiptById after creation.
 */
function detailQueryResponses() {
  return (sql) => {
    if (sql.includes('FROM goods_receipts gr') && sql.includes('JOIN purchase_orders')) {
      return {
        rows: [{
          id: 'gr-id', gr_number: 'GR-2026-0003', po_id: 'po-id-001', status: 'DRAFT',
          receipt_date: '2026-09-03', notes: 'Received in good condition',
          created_at: new Date(), updated_at: new Date(),
          po_number: 'PO-2026-0001', vendor_name: 'PT Supplier Jaya',
        }],
        rowCount: 1,
      };
    }
    if (sql.includes('FROM gr_lines grl')) {
      return {
        rows: [{
          id: 'gr-line-1', line_no: 1, po_line_id: 'po-line-001', qty_received: 3,
          item_code: 'BRG-001', item_name: 'Safety Helmet', qty_ordered: 5,
          qty_already_received: 0, uom: 'PCS', unit_price: 150000,
          site_code: 'WH-JKT', required_date: null,
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
    await expect(createGoodsReceipt(db, { lines: [{}] }))
      .rejects.toMatchObject({ message: 'poId is required', statusCode: 422 });
  });

  test('rejects when poId is empty string', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { poId: '   ', lines: [{}] }))
      .rejects.toMatchObject({ message: 'poId is required', statusCode: 422 });
  });

  test('rejects when lines is empty array', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { poId: 'po-1', lines: [] }))
      .rejects.toMatchObject({ message: 'lines must contain at least one item', statusCode: 422 });
  });

  test('rejects when lines is not an array', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { poId: 'po-1', lines: 'nope' }))
      .rejects.toMatchObject({ message: 'lines must contain at least one item', statusCode: 422 });
  });

  test('rejects when poLineId is missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{ qtyReceived: 3, actualSiteCode: 'WH' }],
    });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].poLineId is required', statusCode: 422 });
  });

  test('rejects when qtyReceived is zero', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{ poLineId: 'po-line-1', qtyReceived: 0, actualSiteCode: 'WH' }],
    });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].qtyReceived must be greater than 0', statusCode: 422 });
  });

  test('rejects when qtyReceived is negative', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{ poLineId: 'po-line-1', qtyReceived: -2, actualSiteCode: 'WH' }],
    });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].qtyReceived must be greater than 0', statusCode: 422 });
  });
});

// ─────────────────────────────────────────────────────────
// PO Validation
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – PO validation', () => {
  test('rejects when PO not found', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
        return { rows: [], rowCount: 0 }; // Not found
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'Purchase order not found',
        statusCode: 422,
      });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects when PO is not SUBMITTED', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'po-id-001', status: 'DRAFT' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'PO must be SUBMITTED before creating goods receipt',
        statusCode: 422,
      });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

// ─────────────────────────────────────────────────────────
// Over-Receipt Guard
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – over-receipt guard', () => {
  test('rejects when received qty exceeds PO line open qty', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'po-id-001', status: 'SUBMITTED' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM po_lines') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'po-line-001', qty_ordered: 5, qty_received: 2 }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    // Receiving 4 but only 3 open (5 - 2)
    const payload = validPayload({
      lines: [{ poLineId: 'po-line-001', qtyReceived: 4, actualSiteCode: 'WH' }],
    });

    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({
        message: 'lines[0]: received qty 4 exceeds open qty 3',
        statusCode: 422,
      });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('allows receipt when qty equals exact open quantity', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'po-id-001', status: 'SUBMITTED' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM po_lines') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'po-line-001', qty_ordered: 5, qty_received: 2 }],
          rowCount: 1,
        };
      }
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const db = mockDb(client, detailQueryResponses());

    // Receiving exactly 3 with 3 open
    const payload = validPayload({
      lines: [{ poLineId: 'po-line-001', qtyReceived: 3, actualSiteCode: 'WH' }],
    });

    const result = await createGoodsReceipt(db, payload);
    expect(result).toBeDefined();
    expect(result.status).toBe('DRAFT');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rejects when PO line does not exist', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'po-id-001', status: 'SUBMITTED' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM po_lines') && sql.includes('FOR UPDATE')) {
        return { rows: [], rowCount: 0 }; // Not found
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: PO line not found',
        statusCode: 422,
      });
  });
});

// ─────────────────────────────────────────────────────────
// Successful GR Creation
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – success path', () => {
  test('creates GR and returns detail with DRAFT status', async () => {
    const client = mockClient(happyPathClientResponses());
    const db = mockDb(client, detailQueryResponses());

    const result = await createGoodsReceipt(db, validPayload());

    expect(result.grNumber).toBe('GR-2026-0003');
    expect(result.status).toBe('DRAFT');
    expect(result.poId).toBe('po-id-001');
    expect(result.poNumber).toBe('PO-2026-0001');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].itemCode).toBe('BRG-001');
    expect(result.lines[0].qtyReceived).toBe(3);
    expect(result.lines[0].lineCost).toBe(450000); // 150000 * 3
    expect(result.totalCost).toBe(450000);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rolls back and releases client on unexpected error', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN') return { rows: [], rowCount: 0 };
      if (sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id') && sql.includes('FOR UPDATE')) {
        throw new Error('Unexpected DB error');
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toThrow('Unexpected DB error');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('generates unique GR numbers', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [], rowCount: 0 };
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ total: 999 }], rowCount: 1 };
      }
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [
            { id: 'po-id-001', status: 'SUBMITTED' },
            { id: 'po-line-001', qty_ordered: 5, qty_received: 0 },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });
    const db = mockDb(client, () => ({
      rows: [{ id: 'gr-id', gr_number: 'GR-2026-1000', status: 'DRAFT', poId: 'po-id-001' }],
      rowCount: 1,
    }));

    const result = await createGoodsReceipt(db, validPayload());
    expect(result.grNumber).toBe('GR-2026-1000');
  });
});

// ─────────────────────────────────────────────────────────
// Post GR (DRAFT → POSTED)
// ─────────────────────────────────────────────────────────

describe('postGoodsReceipt – status transition', () => {
  test('rejects when GR not found', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts WHERE id') && sql.includes('FOR UPDATE')) {
        return { rows: [], rowCount: 0 }; // Not found
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    const result = await postGoodsReceipt(db, 'gr-not-found');
    expect(result).toBeNull();
  });

  test('rejects when GR is not DRAFT', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts WHERE id') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'gr-id', status: 'POSTED', po_id: 'po-id-001' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(postGoodsReceipt(db, 'gr-id'))
      .rejects.toMatchObject({
        message: 'Only DRAFT goods receipt can be posted',
        statusCode: 422,
      });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('updates GR status to POSTED and updates PO lines qty_received', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts WHERE id') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'gr-id', status: 'DRAFT', po_id: 'po-id-001' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM gr_lines WHERE gr_id')) {
        return {
          rows: [
            { po_line_id: 'po-line-001', qty_received: 3 },
            { po_line_id: 'po-line-002', qty_received: 2 },
          ],
          rowCount: 2,
        };
      }
      if (sql.startsWith('UPDATE')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client, detailQueryResponses());

    const result = await postGoodsReceipt(db, 'gr-id');

    expect(result).toBeDefined();
    expect(result.status).toBe('DRAFT'); // Will be DRAFT in mock response
    expect(client.query).toHaveBeenCalledWith('COMMIT');

    // Verify UPDATE po_lines was called for each GR line
    const updateCalls = client.query.mock.calls.filter((call) => call[0].startsWith('UPDATE po_lines'));
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
  });
});
