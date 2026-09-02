import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import PurchaseOrderHeaderForm from './PurchaseOrderHeaderForm.vue';

function mountHeaderForm() {
  return mount(PurchaseOrderHeaderForm, {
    props: {
      modelValue: {
        vendorName: '',
        neededByDate: '',
        currency: 'IDR',
        paymentTerms: '',
        notes: '',
      },
    },
  });
}

describe('PurchaseOrderHeaderForm', () => {
  test('renders Figma header fields', () => {
    const wrapper = mountHeaderForm();

    expect(wrapper.text()).toContain('PO Header');
    expect(wrapper.text()).toContain('Vendor');
    expect(wrapper.text()).toContain('Needed By date');
    expect(wrapper.text()).toContain('Currency');
    expect(wrapper.text()).toContain('Payment Terms');
    expect(wrapper.text()).toContain('Notes');
  });

  test('emits updated header values when fields change', async () => {
    const wrapper = mountHeaderForm();

    await wrapper.find('input[placeholder="Type..."]').setValue('PT Supplier Jaya');

    const updates = wrapper.emitted('update:modelValue');
    expect(updates).toBeTruthy();
    expect(updates.at(-1)[0]).toMatchObject({ vendorName: 'PT Supplier Jaya' });
  });
});
