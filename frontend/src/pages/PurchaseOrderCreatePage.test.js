import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import PurchaseOrderCreatePage from './PurchaseOrderCreatePage.vue';

const mocks = vi.hoisted(() => ({
  listRequisitions: vi.fn(),
  getRequisitionOpenLines: vi.fn(),
  createPurchaseOrder: vi.fn(),
}));

vi.mock('../api', () => ({
  api: {
    listRequisitions: mocks.listRequisitions,
    getRequisitionOpenLines: mocks.getRequisitionOpenLines,
    createPurchaseOrder: mocks.createPurchaseOrder,
  },
}));

function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  return mount(PurchaseOrderCreatePage, {
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

describe('PurchaseOrderCreatePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('loads approved PR open lines from the API', async () => {
    mocks.listRequisitions.mockResolvedValue({
      items: [
        { id: 'pr-1', prNumber: 'PR-2026-0001', status: 'APPROVED' },
        { id: 'pr-2', prNumber: 'PR-2026-0002', status: 'APPROVED' },
      ],
    });

    mocks.getRequisitionOpenLines
      .mockResolvedValueOnce({
        requisition: { id: 'pr-1', prNumber: 'PR-2026-0001', status: 'APPROVED' },
        openLines: [{
          id: 'line-1',
          prLineId: 'line-1',
          prNumber: 'PR-2026-0001',
          prLineNo: 1,
          itemCode: 'ITEM-001',
          itemName: 'Bearing-6205',
          qtyRequested: 20,
          qtyAllocated: 5,
          qtyOpenForPo: 15,
          remainingQty: 15,
          qtyOrdered: 0,
          uom: 'PCS',
          unitPrice: 150000,
          siteCode: 'JKT-PLANT',
          selected: true,
        }],
      })
      .mockResolvedValueOnce({
        requisition: { id: 'pr-2', prNumber: 'PR-2026-0002', status: 'APPROVED' },
        openLines: [{
          id: 'line-2',
          prLineId: 'line-2',
          prNumber: 'PR-2026-0002',
          prLineNo: 1,
          itemCode: 'ITEM-009',
          itemName: 'Grease High Temp',
          qtyRequested: 12,
          qtyAllocated: 0,
          qtyOpenForPo: 12,
          remainingQty: 12,
          qtyOrdered: 0,
          uom: 'TUBE',
          unitPrice: 0,
          siteCode: 'SBY-WH',
          selected: false,
        }],
      });

    const wrapper = mountPage();
    await flushPromises();

    expect(mocks.listRequisitions).toHaveBeenCalled();
    expect(mocks.getRequisitionOpenLines).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('ITEM-001');
  });

  test('submits valid PO payload to the API', async () => {
    mocks.listRequisitions.mockResolvedValue({
      items: [
        { id: 'pr-1', prNumber: 'PR-2026-0001', status: 'APPROVED' },
      ],
    });

    mocks.getRequisitionOpenLines.mockResolvedValue({
      requisition: { id: 'pr-1', prNumber: 'PR-2026-0001', status: 'APPROVED' },
      openLines: [{
        id: 'line-1',
        prLineId: 'line-1',
        prNumber: 'PR-2026-0001',
        prLineNo: 1,
        itemCode: 'ITEM-001',
        itemName: 'Bearing-6205',
        qtyRequested: 20,
        qtyAllocated: 5,
        qtyOpenForPo: 15,
        remainingQty: 15,
        qtyOrdered: 4,
        uom: 'PCS',
        unitPrice: 150000,
        siteCode: 'JKT-PLANT',
        selected: true,
      }],
    });

    mocks.createPurchaseOrder.mockResolvedValue({
      id: 'po-123',
      status: 'DRAFT',
      poNumber: 'PO-2026-0001',
    });

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('input[placeholder="Type..."]').setValue('PT Supplier Jaya');
    await wrapper.find('form').trigger('submit');

    expect(mocks.createPurchaseOrder).toHaveBeenCalledWith({
      vendorName: 'PT Supplier Jaya',
      lines: [
        expect.objectContaining({
          prLineId: 'line-1',
          itemCode: 'ITEM-001',
          qtyOrdered: 4,
        }),
      ],
    });
  });
});
