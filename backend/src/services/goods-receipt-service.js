import { v4 as uuidv4 } from 'uuid';

// ── Mappers ──────────────────────────────────────────────

function mapHeader(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
    poNumber: row.po_number,
    vendorName: row.vendor_name,
    status: row.status,
    receiptDate: row.receipt_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row, headerStatus) {
  const poQtyReceived = Number(row.po_qty_received);
  const qtyReceived = Number(row.qty_received);

  return {
    id: row.id,
    lineNo: row.line_no,
    poLineId: row.po_line_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    uom: row.uom,
    qtyOrdered: Number(row.qty_ordered),
    qtyReceived,
    qtyPreviouslyReceived: headerStatus === 'POSTED' ? poQtyReceived - qtyReceived : poQtyReceived,
    actualSiteCode: row.actual_site_code,
  };
}

function createGrNumber(count) {
  const next = String(Number(count) + 1).padStart(4, '0');
  return `GR-2026-${next}`;
}

// ── Validation ───────────────────────────────────────────

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Body is required';
  }

  if (!payload.poId || typeof payload.poId !== 'string') {
    return 'poId is required';
  }

  if (!payload.receiptDate || typeof payload.receiptDate !== 'string') {
    return 'receiptDate is required';
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  const seenPoLineIds = new Set();
  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i];

    if (!line.poLineId) {
      return `lines[${i}].poLineId is required`;
    }

    if (seenPoLineIds.has(line.poLineId)) {
      return `lines[${i}].poLineId is duplicated`;
    }
    seenPoLineIds.add(line.poLineId);

    if (!Number(line.qtyReceived) || Number(line.qtyReceived) <= 0) {
      return `lines[${i}].qtyReceived must be greater than 0`;
    }

    if (!line.actualSiteCode || typeof line.actualSiteCode !== 'string') {
      return `lines[${i}].actualSiteCode is required`;
    }
  }

  return null;
}

// ── Queries ──────────────────────────────────────────────

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, gr.status, gr.receipt_date, gr.notes,
            gr.created_at, gr.updated_at, po.po_number, po.vendor_name
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );

  return rows.map(mapHeader);
}

export async function getGoodsReceiptById(db, id) {
  const headerResult = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, gr.status, gr.receipt_date, gr.notes,
            gr.created_at, gr.updated_at, po.po_number, po.vendor_name
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     WHERE gr.id = $1`,
    [id]
  );

  if (headerResult.rowCount === 0) {
    return null;
  }

  const header = headerResult.rows[0];

  const linesResult = await db.query(
    `SELECT gl.id, gl.line_no, gl.po_line_id, gl.qty_received, gl.actual_site_code,
            pl.item_code, pl.item_name, pl.uom, pl.qty_ordered, pl.qty_received AS po_qty_received
     FROM gr_lines gl
     JOIN po_lines pl ON pl.id = gl.po_line_id
     WHERE gl.gr_id = $1
     ORDER BY gl.line_no ASC`,
    [id]
  );

  return {
    ...mapHeader(header),
    lines: linesResult.rows.map((row) => mapLine(row, header.status)),
  };
}

// ── Create GR draft (from a submitted PO's open lines) ──

export async function createGoodsReceipt(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 422;
    throw err;
  }

  const poResult = await db.query(
    `SELECT id, status FROM purchase_orders WHERE id = $1`,
    [payload.poId]
  );

  if (poResult.rowCount === 0) {
    const err = new Error('poId not found');
    err.statusCode = 422;
    throw err;
  }

  if (poResult.rows[0].status !== 'SUBMITTED') {
    const err = new Error('Purchase order must be SUBMITTED to create a goods receipt');
    err.statusCode = 422;
    throw err;
  }

  const poLinesResult = await db.query(
    `SELECT id, qty_ordered, qty_received FROM po_lines WHERE po_id = $1`,
    [payload.poId]
  );
  const poLinesById = new Map(poLinesResult.rows.map((row) => [row.id, row]));

  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i];
    const poLine = poLinesById.get(line.poLineId);

    if (!poLine) {
      const err = new Error(`lines[${i}]: PO line does not belong to the selected purchase order`);
      err.statusCode = 422;
      throw err;
    }

    const openQty = Number(poLine.qty_ordered) - Number(poLine.qty_received);
    if (openQty <= 0) {
      const err = new Error(`lines[${i}]: PO line has no open quantity remaining`);
      err.statusCode = 422;
      throw err;
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM goods_receipts`);
    const grNumber = createGrNumber(countResult.rows[0].total);
    const grId = uuidv4();

    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [grId, grNumber, payload.poId, payload.receiptDate, payload.notes || null]
    );

    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), grId, line.poLineId, i + 1, Number(line.qtyReceived), line.actualSiteCode]
      );
    }

    await client.query('COMMIT');

    return getGoodsReceiptById(db, grId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Post GR (DRAFT → POSTED, updates PO/PR received qty) ─

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const headerResult = await client.query(
      `SELECT id, status FROM goods_receipts WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (headerResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    if (headerResult.rows[0].status !== 'DRAFT') {
      const err = new Error('Only DRAFT goods receipt can be posted');
      err.statusCode = 422;
      throw err;
    }

    const linesResult = await client.query(
      `SELECT id, po_line_id, qty_received FROM gr_lines WHERE gr_id = $1 ORDER BY line_no ASC`,
      [id]
    );

    for (const line of linesResult.rows) {
      const poLineResult = await client.query(
        `SELECT id, qty_ordered, qty_received FROM po_lines WHERE id = $1 FOR UPDATE`,
        [line.po_line_id]
      );

      if (poLineResult.rowCount === 0) {
        const err = new Error(`PO line ${line.po_line_id} not found`);
        err.statusCode = 422;
        throw err;
      }

      const poLine = poLineResult.rows[0];
      const remaining = Number(poLine.qty_ordered) - Number(poLine.qty_received);
      if (Number(line.qty_received) > remaining) {
        const err = new Error(
          `PO line ${line.po_line_id}: receipt qty ${line.qty_received} exceeds remaining ${remaining}`
        );
        err.statusCode = 422;
        throw err;
      }

      const allocationResult = await client.query(
        `SELECT pr_line_id FROM pr_line_allocations WHERE po_line_id = $1`,
        [line.po_line_id]
      );

      if (allocationResult.rowCount === 0) {
        const err = new Error(`PO line ${line.po_line_id} has no PR allocation to update`);
        err.statusCode = 422;
        throw err;
      }

      await client.query(
        `UPDATE po_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`,
        [Number(line.qty_received), line.po_line_id]
      );

      await client.query(
        `UPDATE pr_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`,
        [Number(line.qty_received), allocationResult.rows[0].pr_line_id]
      );
    }

    await client.query(
      `UPDATE goods_receipts SET status = 'POSTED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return getGoodsReceiptById(db, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
