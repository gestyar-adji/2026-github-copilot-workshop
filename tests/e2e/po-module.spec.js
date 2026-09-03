const { test, expect } = require('@playwright/test');

async function openCreatePage(page) {
  await page.goto('/purchase-orders/new');
  await expect(page.getByRole('heading', { name: 'Create Purchase Order' })).toBeVisible();
  await expect(page.locator('.allocation-card tbody tr').first()).toBeVisible();
}

function lineByItemCode(page, itemCode) {
  return page.locator('.allocation-card tbody tr').filter({ hasText: itemCode });
}

test.describe('Purchase Order module', () => {
  test('creates and submits a purchase order from an approved PR line', async ({ page }) => {
    await openCreatePage(page);

    const line = lineByItemCode(page, 'BRG-6205');
    await expect(line).toContainText('BRG-6205');
    const quantityInput = line.locator('input[type="number"]').first();
    await expect(quantityInput).toHaveAttribute('max', /\d+(\.\d+)?/);
    await lineByItemCode(page, 'GLV-IND').locator('input[type="checkbox"]').uncheck();

    await page.locator('.po-header-card input').first().fill('PT E2E Test Supplier');
    await quantityInput.fill('1');
    await page.getByRole('button', { name: 'Save As Draft' }).click();

    await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/i);
    await expect(page.getByRole('heading', { name: 'Detail Purchase Order' })).toBeVisible();
    await expect(page.locator('.status-badge')).toHaveText('DRAFT');
    await expect(page.locator('.card-panel input').first()).toHaveValue('PT E2E Test Supplier');
    await expect(page.locator('table tbody tr').filter({ hasText: 'BRG-6205' })).toContainText('1');

    await page.getByRole('button', { name: 'Submit PO' }).click();
    await expect(page.locator('.status-badge')).toHaveText('SUBMITTED');
    await expect(page.getByRole('button', { name: 'Submit PO' })).toHaveCount(0);
  });

  test('blocks an order quantity above the PR line remaining quantity', async ({ page }) => {
    await openCreatePage(page);

    const line = lineByItemCode(page, 'GLV-IND');
    await expect(line).toContainText('GLV-IND');
    const quantityInput = line.locator('input[type="number"]').first();
    const remainingQuantity = Number(await quantityInput.getAttribute('max'));
    expect(remainingQuantity).toBeGreaterThan(0);
    await lineByItemCode(page, 'BRG-6205').locator('input[type="checkbox"]').uncheck();

    await page.locator('.po-header-card input').first().fill('PT E2E Validation Supplier');
    await quantityInput.fill(String(remainingQuantity + 1));

    const createRequests = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/purchase-orders')) {
        createRequests.push(request);
      }
    });
    await page.getByRole('button', { name: 'Save As Draft' }).click();

    expect(await quantityInput.evaluate((input) => input.checkValidity())).toBe(false);
    expect(createRequests).toHaveLength(0);
    await expect(page).toHaveURL(/\/purchase-orders\/new$/);
  });
});
