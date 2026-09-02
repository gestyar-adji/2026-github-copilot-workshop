<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to dashboard">
          <img src="../assets/figma-arrow-back.svg" alt="" />
        </RouterLink>
        <div>
          <h2>Create Purchase Order</h2>
          <p class="muted">Pick approved PR lines and allocate order quantities</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

    <form @submit.prevent="handleSubmit">
      <PurchaseOrderHeaderForm v-model="header" />
      <LineAllocationTable :lines="allocationLines" />

      <div class="summary-panel">
        <div>
          <span class="muted">Selected Lines</span>
          <strong>{{ selectedLines.length }}</strong>
        </div>
        <div>
          <span class="muted">Estimated Total</span>
          <strong>{{ formatMoney(totalAmount) }}</strong>
        </div>
      </div>

      <div class="btn-group">
        <RouterLink to="/" class="btn btn-outline">Cancel</RouterLink>
        <button class="btn btn-secondary" type="submit">Save As Draft</button>
        <button class="btn btn-primary" type="button" @click="handleSubmitPo">Submit PO</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LineAllocationTable from '../components/LineAllocationTable.vue';
import PurchaseOrderHeaderForm from '../components/PurchaseOrderHeaderForm.vue';

const errorMessage = ref('');
const successMessage = ref('');

const header = ref({
  vendorName: '',
  neededByDate: '',
  currency: 'IDR',
  paymentTerms: '',
  notes: '',
});

const allocationLines = reactive([
  {
    prLineId: 'sample-pr-line-1',
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
    prLineId: 'sample-pr-line-2',
    prNumber: 'PR-001',
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
    selected: true,
  },
  {
    prLineId: 'sample-pr-line-3',
    prNumber: 'PR-004',
    prLineNo: 1,
    itemCode: 'ITEM-015',
    itemName: 'Bearing-6205',
    qtyRequested: 50,
    qtyAllocated: 10,
    remainingQty: 40,
    qtyOrdered: 20,
    uom: 'PAIR',
    deliveryAddress: '',
    deliveryDate: '',
    unitPrice: 32000,
    selected: true,
  },
]);

const selectedLines = computed(() => allocationLines.filter((line) => line.selected));
const totalAmount = computed(() =>
  selectedLines.value.reduce((sum, line) => sum + Number(line.qtyOrdered || 0) * Number(line.unitPrice || 0), 0)
);

function validateForm() {
  if (!header.value.vendorName.trim()) {
    return 'Vendor name is required.';
  }

  if (selectedLines.value.length === 0) {
    return 'Select at least one PR line.';
  }

  const invalidLine = selectedLines.value.find(
    (line) => Number(line.qtyOrdered) <= 0 || Number(line.qtyOrdered) > Number(line.remainingQty)
  );

  if (invalidLine) {
    return `${invalidLine.itemCode} order quantity must be greater than zero and no more than open quantity.`;
  }

  return '';
}

function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  const validationError = validateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  successMessage.value = 'Draft purchase order structure is ready for API integration.';
}

function handleSubmitPo() {
  handleSubmit();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US');
}
</script>

<style scoped>
.back-btn img {
  width: 24px;
  height: 24px;
}

.summary-panel {
  background: var(--white);
  border-radius: var(--radius-card);
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  margin-bottom: 24px;
}

.summary-panel div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.summary-panel div:last-child {
  align-items: flex-end;
  text-align: right;
}

.summary-panel strong {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -1.6px;
}

.btn-secondary {
  background: #fdb702;
  color: var(--white);
}

.success-message {
  color: #2e7d32;
  font-size: 13px;
}
</style>