import { describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import PurchaseOrderListPage from './PurchaseOrderListPage.vue';

const listPurchaseOrdersMock = vi.hoisted(() => vi.fn());

vi.mock('../api', () => ({
  api: {
    listPurchaseOrders: listPurchaseOrdersMock,
  },
}));

function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  return mount(PurchaseOrderListPage, {
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

describe('PurchaseOrderListPage', () => {
  test('loads purchase orders from the API and renders them', async () => {
    listPurchaseOrdersMock.mockResolvedValue({
      items: [
        { id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'PT Sumber Teknik Abadi', status: 'SUBMITTED', createdAt: '2026-09-01T00:00:00Z' },
        { id: 'po-2', poNumber: 'PO-2026-0002', vendorName: 'PT Jaya Mekar', status: 'DRAFT', createdAt: '2026-09-02T00:00:00Z' },
      ],
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(listPurchaseOrdersMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('PO-2026-0001');
    expect(wrapper.text()).toContain('PT Sumber Teknik Abadi');
    expect(wrapper.text()).toContain('SUBMITTED');
  });
});
