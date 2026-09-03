import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import GoodsReceiptDetailPage from './GoodsReceiptDetailPage.vue';

const mocks = vi.hoisted(() => ({
  getGoodsReceipt: vi.fn(),
  postGoodsReceipt: vi.fn(),
}));

vi.mock('../api', () => ({
  api: {
    getGoodsReceipt: mocks.getGoodsReceipt,
    postGoodsReceipt: mocks.postGoodsReceipt,
  },
}));

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/goods-receipts/:id', name: 'goods-receipts-detail', component: GoodsReceiptDetailPage }],
  });
  router.push('/goods-receipts/gr-1');
  await router.isReady();

  return mount(GoodsReceiptDetailPage, {
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

describe('GoodsReceiptDetailPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('shows the Post GR button only when the receipt is DRAFT', async () => {
    mocks.getGoodsReceipt.mockResolvedValue({
      id: 'gr-1',
      grNumber: 'GR-2026-0001',
      poNumber: 'PO-2026-0001',
      status: 'DRAFT',
      receiptDate: '2026-09-03',
      notes: null,
      lines: [{
        id: 'gr-line-1', lineNo: 1, itemCode: 'BRG-6205', itemName: 'Bearing 6205', uom: 'PCS',
        qtyOrdered: 12, qtyPreviouslyReceived: 0, qtyReceived: 3, actualSiteCode: 'JKT-PLANT',
      }],
    });

    const wrapper = await mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('GR-2026-0001');
    expect(wrapper.find('button').text()).toBe('Post GR');
  });

  test('hides the Post GR button when the receipt is POSTED', async () => {
    mocks.getGoodsReceipt.mockResolvedValue({
      id: 'gr-1',
      grNumber: 'GR-2026-0001',
      poNumber: 'PO-2026-0001',
      status: 'POSTED',
      receiptDate: '2026-09-03',
      notes: null,
      lines: [],
    });

    const wrapper = await mountPage();
    await flushPromises();

    expect(wrapper.find('button').exists()).toBe(false);
  });

  test('posts the goods receipt and refreshes status', async () => {
    mocks.getGoodsReceipt.mockResolvedValue({
      id: 'gr-1',
      grNumber: 'GR-2026-0001',
      poNumber: 'PO-2026-0001',
      status: 'DRAFT',
      receiptDate: '2026-09-03',
      notes: null,
      lines: [],
    });
    mocks.postGoodsReceipt.mockResolvedValue({
      id: 'gr-1',
      grNumber: 'GR-2026-0001',
      poNumber: 'PO-2026-0001',
      status: 'POSTED',
      receiptDate: '2026-09-03',
      notes: null,
      lines: [],
    });

    const wrapper = await mountPage();
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(mocks.postGoodsReceipt).toHaveBeenCalledWith('gr-1');
    expect(wrapper.find('.status-badge').text()).toBe('POSTED');
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
