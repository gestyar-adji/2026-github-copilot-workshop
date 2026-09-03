import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import GoodsReceiptCreatePage from './GoodsReceiptCreatePage.vue';

const mocks = vi.hoisted(() => ({
  getPurchaseOrder: vi.fn(),
  getPurchaseOrderOpenLines: vi.fn(),
  createGoodsReceipt: vi.fn(),
}));

vi.mock('../api', () => ({
  api: {
    getPurchaseOrder: mocks.getPurchaseOrder,
    getPurchaseOrderOpenLines: mocks.getPurchaseOrderOpenLines,
    createGoodsReceipt: mocks.createGoodsReceipt,
  },
}));

function mountPage(poId = 'po-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  return mount(GoodsReceiptCreatePage, {
    props: { poId },
    global: {
      plugins: [router],
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  });
}

describe('GoodsReceiptCreatePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('loads open PO lines from the API', async () => {
    mocks.getPurchaseOrder.mockResolvedValue({ id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' });
    mocks.getPurchaseOrderOpenLines.mockResolvedValue({
      purchaseOrder: { id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' },
      openLines: [{
        id: 'po-line-1',
        itemCode: 'BRG-6205',
        itemName: 'Bearing 6205',
        uom: 'PCS',
        qtyOrdered: 12,
        qtyOpenForGr: 12,
        siteCode: 'JKT-PLANT',
      }],
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(mocks.getPurchaseOrderOpenLines).toHaveBeenCalledWith('po-1');
    expect(wrapper.text()).toContain('BRG-6205');
  });

  test('shows a validation error when no line is selected', async () => {
    mocks.getPurchaseOrder.mockResolvedValue({ id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' });
    mocks.getPurchaseOrderOpenLines.mockResolvedValue({
      purchaseOrder: { id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' },
      openLines: [{
        id: 'po-line-1',
        itemCode: 'BRG-6205',
        itemName: 'Bearing 6205',
        uom: 'PCS',
        qtyOrdered: 12,
        qtyOpenForGr: 12,
        siteCode: 'JKT-PLANT',
      }],
    });

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('input[type="checkbox"]').setValue(false);
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Select at least one PO line.');
    expect(mocks.createGoodsReceipt).not.toHaveBeenCalled();
  });

  test('submits a valid goods receipt payload to the API', async () => {
    mocks.getPurchaseOrder.mockResolvedValue({ id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' });
    mocks.getPurchaseOrderOpenLines.mockResolvedValue({
      purchaseOrder: { id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' },
      openLines: [{
        id: 'po-line-1',
        itemCode: 'BRG-6205',
        itemName: 'Bearing 6205',
        uom: 'PCS',
        qtyOrdered: 12,
        qtyOpenForGr: 12,
        siteCode: 'JKT-PLANT',
      }],
    });
    mocks.createGoodsReceipt.mockResolvedValue({ id: 'gr-1', grNumber: 'GR-2026-0001' });

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('input[type="number"]').setValue(3);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mocks.createGoodsReceipt).toHaveBeenCalledWith({
      poId: 'po-1',
      receiptDate: expect.any(String),
      notes: null,
      lines: [
        expect.objectContaining({ poLineId: 'po-line-1', qtyReceived: 3, actualSiteCode: 'JKT-PLANT' }),
      ],
    });
  });
});
