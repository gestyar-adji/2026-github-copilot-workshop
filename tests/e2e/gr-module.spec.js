const { test, expect } = require('@playwright/test');

const SEEDED_PO_NUMBER = 'PO-2026-0001';

async function openSeededPurchaseOrder(page) {
  await page.goto('/purchase-orders');
  await page.getByRole('link', { name: SEEDED_PO_NUMBER }).click();
  await expect(page.getByRole('heading', { name: 'Detail Purchase Order' })).toBeVisible();
}

async function openCreatePageFromPo(page) {
  await openSeededPurchaseOrder(page);
  await page.getByRole('link', { name: 'Create GR' }).click();
  await expect(page.getByRole('heading', { name: 'Create Goods Receipt' })).toBeVisible();
  await expect(page.locator('.gr-lines-card tbody tr').first()).toBeVisible();
}

function lineByItemCode(page, itemCode) {
  return page.locator('.gr-lines-card tbody tr').filter({ hasText: itemCode });
}

test.describe('Goods Receipt module', () => {
  test('creates and posts a goods receipt from a submitted PO open line', async ({ page }) => {
    await openCreatePageFromPo(page);

    const line = lineByItemCode(page, 'BRG-6205');
    await expect(line).toContainText('BRG-6205');
    const quantityInput = line.locator('input[type="number"]');
    await expect(quantityInput).toHaveAttribute('max', /\d+(\.\d+)?/);
    await lineByItemCode(page, 'GLV-IND').locator('input[type="checkbox"]').uncheck();

    await quantityInput.fill('3');
    await page.getByRole('button', { name: 'Save As Draft' }).click();

    await expect(page).toHaveURL(/\/goods-receipts\/[0-9a-f-]+$/i);
    await expect(page.getByRole('heading', { name: 'Detail Goods Receipt' })).toBeVisible();
    await expect(page.locator('.status-badge')).toHaveText('DRAFT');
    await expect(page.locator('table tbody tr').filter({ hasText: 'BRG-6205' })).toContainText('3');

    await page.getByRole('button', { name: 'Post GR' }).click();
    await expect(page.locator('.status-badge')).toHaveText('POSTED');
    await expect(page.getByRole('button', { name: 'Post GR' })).toHaveCount(0);
  });

  test('blocks a receipt quantity above the PO line open quantity', async ({ page }) => {
    await openCreatePageFromPo(page);

    const line = lineByItemCode(page, 'GLV-IND');
    await expect(line).toContainText('GLV-IND');
    const quantityInput = line.locator('input[type="number"]');
    const openQuantity = Number(await quantityInput.getAttribute('max'));
    expect(openQuantity).toBeGreaterThan(0);
    await lineByItemCode(page, 'BRG-6205').locator('input[type="checkbox"]').uncheck();

    await quantityInput.fill(String(openQuantity + 1));

    const createRequests = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/goods-receipts')) {
        createRequests.push(request);
      }
    });
    await page.getByRole('button', { name: 'Save As Draft' }).click();

    expect(await quantityInput.evaluate((input) => input.checkValidity())).toBe(false);
    expect(createRequests).toHaveLength(0);
    await expect(page).toHaveURL(/\/goods-receipts\/new\/[0-9a-f-]+$/i);
  });
});
