import { describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import GoodsReceiptListPage from './GoodsReceiptListPage.vue';

const listGoodsReceiptsMock = vi.hoisted(() => vi.fn());

vi.mock('../api', () => ({
  api: {
    listGoodsReceipts: listGoodsReceiptsMock,
  },
}));

function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  return mount(GoodsReceiptListPage, {
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

describe('GoodsReceiptListPage', () => {
  test('loads goods receipts from the API and renders them', async () => {
    listGoodsReceiptsMock.mockResolvedValue({
      items: [
        { id: 'gr-1', grNumber: 'GR-2026-0001', poNumber: 'PO-2026-0001', status: 'DRAFT', receiptDate: '2026-09-01', createdAt: '2026-09-01T00:00:00Z' },
        { id: 'gr-2', grNumber: 'GR-2026-0002', poNumber: 'PO-2026-0002', status: 'POSTED', receiptDate: '2026-09-02', createdAt: '2026-09-02T00:00:00Z' },
      ],
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(listGoodsReceiptsMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('GR-2026-0001');
    expect(wrapper.text()).toContain('PO-2026-0001');
    expect(wrapper.text()).toContain('POSTED');
  });
});
