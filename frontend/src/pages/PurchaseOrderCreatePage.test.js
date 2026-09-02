import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import PurchaseOrderCreatePage from './PurchaseOrderCreatePage.vue';

function mountPage() {
  return mount(PurchaseOrderCreatePage, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  });
}

describe('PurchaseOrderCreatePage', () => {
  test('renders the Figma-derived PO create layout', () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain('Create Purchase Order');
    expect(wrapper.text()).toContain('Pick approved PR lines and allocate order quantities');
    expect(wrapper.text()).toContain('PO Header');
    expect(wrapper.text()).toContain('Approved PR Lines');
    expect(wrapper.text()).toContain('Selected Lines');
    expect(wrapper.text()).toContain('Estimated Total');
    expect(wrapper.text()).toContain('2,140,000');
  });

  test('requires vendor before saving a draft', async () => {
    const wrapper = mountPage();

    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Vendor name is required.');
  });

  test('rejects selected line with zero ordered quantity', async () => {
    const wrapper = mountPage();

    await wrapper.find('input[placeholder="Type..."]').setValue('PT Supplier Jaya');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('ITEM-009 order quantity must be greater than zero and no more than open quantity.');
  });

  test('shows ready message when draft validation passes', async () => {
    const wrapper = mountPage();

    await wrapper.find('input[placeholder="Type..."]').setValue('PT Supplier Jaya');
    const numberInputs = wrapper.findAll('input[type="number"]');
    await numberInputs[2].setValue(1);
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Draft purchase order structure is ready for API integration.');
  });
});
