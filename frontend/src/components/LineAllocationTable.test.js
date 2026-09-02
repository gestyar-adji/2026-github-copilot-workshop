import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import LineAllocationTable from './LineAllocationTable.vue';

function sampleLines() {
  return [
    {
      prLineId: 'line-1',
      prNumber: 'PR-001',
      prLineNo: 1,
      itemCode: 'ITEM-001',
      itemName: 'Bearing-6205',
      qtyRequested: 20,
      qtyAllocated: 5,
      remainingQty: 15,
      qtyOrdered: 10,
      uom: 'PCS',
      deliveryAddress: '',
      deliveryDate: '',
      unitPrice: 150000,
      selected: true,
    },
    {
      prLineId: 'line-2',
      prNumber: 'PR-002',
      prLineNo: 2,
      itemCode: 'ITEM-009',
      itemName: 'Grease High Temp',
      qtyRequested: 12,
      qtyAllocated: 0,
      remainingQty: 12,
      qtyOrdered: 0,
      uom: 'TUBE',
      deliveryAddress: '',
      deliveryDate: '',
      unitPrice: 0,
      selected: false,
    },
  ];
}

describe('LineAllocationTable', () => {
  test('renders approved PR line allocation columns and values', () => {
    const wrapper = mount(LineAllocationTable, {
      props: { lines: sampleLines() },
    });

    expect(wrapper.text()).toContain('Approved PR Lines');
    expect(wrapper.text()).toContain('Refresh Open Lines');
    expect(wrapper.text()).toContain('Requested QTY');
    expect(wrapper.text()).toContain('Allocated QTY');
    expect(wrapper.text()).toContain('Remaining QTY');
    expect(wrapper.text()).toContain('Delivery Address');
    expect(wrapper.text()).toContain('Line Amount');
    expect(wrapper.text()).toContain('PR-001');
    expect(wrapper.text()).toContain('ITEM-001');
    expect(wrapper.text()).toContain('1,500,000');
  });

  test('disables editable allocation fields when a line is not selected', () => {
    const wrapper = mount(LineAllocationTable, {
      props: { lines: sampleLines() },
    });

    const numberInputs = wrapper.findAll('input[type="number"]');
    expect(numberInputs[2].attributes('disabled')).toBeDefined();
    expect(numberInputs[3].attributes('disabled')).toBeDefined();
  });
});
