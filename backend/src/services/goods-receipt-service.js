import { v4 as uuidv4 } from 'uuid';

// ── Mappers ──────────────────────────────────────────────

function mapHeader(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
    status: row.status,
    receiptDate: row.receipt_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  return {
    id: row.id,
    lineNo: row.line_no,
    poLineId: row.po_line_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyOrdered: Number(row.qty_ordered),
    qtyAlreadyReceived: Number(row.qty_already_received),
    qtyReceived: Number(row.qty_received),
    qtyOpenForGr: Number(row.qty_ordered) - Number(row.qty_already_received),
    uom: row.uom,
    unitPrice: Number(row.unit_price),
    siteCode: row.site_code,
    requiredDate: row.required_date,
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

  if (!payload.poId || typeof payload.poId !== 'string' || !payload.poId.trim()) {
    return 'poId is required';
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i];

    if (!line.poLineId) {
      return `lines[${i}].poLineId is required`;
    }

    if (!Number(line.qtyReceived) || Number(line.qtyReceived) <= 0) {
      return `lines[${i}].qtyReceived must be greater than 0`;
    }
  }

  return null;
}

// ── Queries ──────────────────────────────────────────────

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, gr.status, gr.receipt_date, gr.created_at, gr.updated_at,
            po.po_number, po.vendor_name
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );

  return rows.map((row) => ({
    ...mapHeader(row),
    poNumber: row.po_number,
    vendorName: row.vendor_name,
  }));
}

export async function getGoodsReceiptById(db, id) {
  const headerResult = await db.query(
    `SELECT gr.*, po.po_number, po.vendor_name
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     WHERE gr.id = $1`,
    [id]
  );

  if (headerResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT 
       grl.id, grl.line_no, grl.po_line_id, grl.qty_received,
       pol.item_code, pol.item_name, pol.qty_ordered, pol.qty_received AS qty_already_received,
       pol.uom, pol.unit_price, pol.site_code, pol.required_date
     FROM gr_lines grl
     JOIN po_lines pol ON pol.id = grl.po_line_id
     WHERE grl.gr_id = $1
     ORDER BY grl.line_no ASC`,
    [id]
  );

  const headerRow = headerResult.rows[0];
  const lines = linesResult.rows.map(mapLine);

  // Calculate line costs and total
  const linesCostMap = lines.map((line) => ({
    ...line,
    lineCost: Number(line.unitPrice) * Number(line.qtyReceived),
  }));

  const totalCost = linesCostMap.reduce((sum, line) => sum + line.lineCost, 0);

  return {
    ...mapHeader(headerRow),
    poNumber: headerRow.po_number,
    vendorName: headerRow.vendor_name,
    lines: linesCostMap,
    totalCost,
  };
}

export async function getGoodsReceiptOpenLines(db, id) {
  const headerResult = await db.query(
    `SELECT id, gr_number, status, po_id FROM goods_receipts WHERE id = $1`,
    [id]
  );

  if (headerResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT 
       grl.id, grl.line_no, grl.po_line_id, grl.qty_received,
       pol.item_code, pol.item_name, pol.qty_ordered, pol.qty_received AS qty_already_received,
       pol.uom, pol.unit_price, pol.site_code, pol.required_date
     FROM gr_lines grl
     JOIN po_lines pol ON pol.id = grl.po_line_id
     WHERE grl.gr_id = $1
     ORDER BY grl.line_no ASC`,
    [id]
  );

  const openLines = linesResult.rows
    .map(mapLine)
    .filter((line) => line.qtyOpenForGr > 0);

  return {
    goodsReceipt: {
      id: headerResult.rows[0].id,
      grNumber: headerResult.rows[0].gr_number,
      status: headerResult.rows[0].status,
      poId: headerResult.rows[0].po_id,
    },
    openLines,
  };
}

// ── Create GR (with over-receipt guard) ──────────────────

export async function createGoodsReceipt(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 422;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verify PO exists and is SUBMITTED
    const poResult = await client.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
      [payload.poId]
    );

    if (poResult.rowCount === 0) {
      const err = new Error('Purchase order not found');
      err.statusCode = 422;
      throw err;
    }

    if (poResult.rows[0].status !== 'SUBMITTED') {
      const err = new Error('PO must be SUBMITTED before creating goods receipt');
      err.statusCode = 422;
      throw err;
    }

    // Lock and validate every referenced PO line
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];

      // Lock the PO line row to prevent concurrent over-receipt
      const poLineResult = await client.query(
        `SELECT id, qty_ordered, qty_received
         FROM po_lines
         WHERE id = $1
         FOR UPDATE`,
        [line.poLineId]
      );

      if (poLineResult.rowCount === 0) {
        const err = new Error(`lines[${i}]: PO line not found`);
        err.statusCode = 422;
        throw err;
      }

      const poLine = poLineResult.rows[0];
      const qtyOpen = Number(poLine.qty_ordered) - Number(poLine.qty_received);

      if (Number(line.qtyReceived) > qtyOpen) {
        const err = new Error(
          `lines[${i}]: received qty ${line.qtyReceived} exceeds open qty ${qtyOpen}`
        );
        err.statusCode = 422;
        throw err;
      }
    }

    // Generate GR number
    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM goods_receipts`);
    const grNumber = createGrNumber(countResult.rows[0].total);
    const grId = uuidv4();

    // Insert GR header
    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [grId, grNumber, payload.poId, payload.receiptDate || null, payload.notes || null]
    );

    // Insert GR lines
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];

      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          grId,
          line.poLineId,
          i + 1,
          Number(line.qtyReceived),
          line.actualSiteCode || '',
        ]
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

// ── Post GR (DRAFT → POSTED) ─────────────────────────────

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, status, po_id FROM goods_receipts WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (currentResult.rowCount === 0) {
      return null;
    }

    if (currentResult.rows[0].status !== 'DRAFT') {
      const err = new Error('Only DRAFT goods receipt can be posted');
      err.statusCode = 422;
      throw err;
    }

    const grId = currentResult.rows[0].id;

    // Update GR status
    await client.query(
      `UPDATE goods_receipts
       SET status = 'POSTED', updated_at = NOW()
       WHERE id = $1`,
      [grId]
    );

    // Update PO lines qty_received from GR lines
    const grLinesResult = await client.query(
      `SELECT po_line_id, qty_received FROM gr_lines WHERE gr_id = $1`,
      [grId]
    );

    for (const grLine of grLinesResult.rows) {
      await client.query(
        `UPDATE po_lines
         SET qty_received = qty_received + $1, updated_at = NOW()
         WHERE id = $2`,
        [Number(grLine.qty_received), grLine.po_line_id]
      );
    }

    await client.query('COMMIT');

    return getGoodsReceiptById(db, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
