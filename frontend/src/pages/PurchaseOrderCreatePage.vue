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
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { api } from '../api';
import LineAllocationTable from '../components/LineAllocationTable.vue';
import PurchaseOrderHeaderForm from '../components/PurchaseOrderHeaderForm.vue';

const router = useRouter();
const errorMessage = ref('');
const successMessage = ref('');

const header = ref({
  vendorName: '',
  neededByDate: '',
  currency: 'IDR',
  paymentTerms: '',
  notes: '',
});

const allocationLines = reactive([]);

const selectedLines = computed(() => allocationLines.filter((line) => line.selected));
const totalAmount = computed(() =>
  selectedLines.value.reduce((sum, line) => sum + Number(line.qtyOrdered || 0) * Number(line.unitPrice || 0), 0)
);

function normalizeOpenLine(line, prNumber) {
  const remainingQty = Number(line.qtyOpenForPo ?? line.remainingQty ?? 0);

  return {
    id: line.id,
    prLineId: line.prLineId || line.id,
    prNumber: prNumber || line.prNumber,
    prLineNo: line.lineNo ?? line.prLineNo ?? 1,
    itemCode: line.itemCode,
    itemName: line.itemName,
    qtyRequested: Number(line.qtyRequested || 0),
    qtyAllocated: Number(line.qtyAllocated || 0),
    remainingQty,
    qtyOrdered: Number(line.qtyOrdered || 0),
    uom: line.uom,
    deliveryAddress: '',
    deliveryDate: '',
    unitPrice: Number(line.unitPrice || 0),
    siteCode: line.siteCode,
    selected: Boolean(line.selected ?? true),
  };
}

async function loadApprovedPrOpenLines() {
  try {
    errorMessage.value = '';
    const requisitions = await api.listRequisitions();
    const approved = (requisitions.items || []).filter((item) => item.status === 'APPROVED');

    const allLines = [];
    for (const requisition of approved) {
      const payload = await api.getRequisitionOpenLines(requisition.id);
      const openLines = (payload?.openLines || []).map((line) =>
        normalizeOpenLine(line, payload?.requisition?.prNumber || requisition.prNumber)
      );
      allLines.push(...openLines);
    }

    allocationLines.splice(0, allocationLines.length, ...allLines);

    if (allocationLines.length === 0) {
      errorMessage.value = 'No approved PR open lines are available for PO creation.';
    }
  } catch (error) {
    errorMessage.value = error.message;
  }
}

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

function buildPurchaseOrderPayload() {
  return {
    vendorName: header.value.vendorName.trim(),
    lines: selectedLines.value.map((line) => ({
      prLineId: line.prLineId,
      itemCode: line.itemCode,
      itemName: line.itemName,
      qtyOrdered: Number(line.qtyOrdered),
      uom: line.uom,
      unitPrice: Number(line.unitPrice || 0),
      siteCode: line.siteCode,
      requiredDate: line.deliveryDate || null,
    })),
  };
}

async function submitPurchaseOrder() {
  errorMessage.value = '';
  successMessage.value = '';

  const validationError = validateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  try {
    const payload = buildPurchaseOrderPayload();
    const created = await api.createPurchaseOrder(payload);
    successMessage.value = `Purchase order ${created.poNumber || created.id} created successfully.`;
    await router.push(`/purchase-orders/${created.id}`);
  } catch (error) {
    errorMessage.value = error.message || 'Unable to create purchase order.';
  }
}

async function handleSubmit() {
  await submitPurchaseOrder();
}

async function handleSubmitPo() {
  await submitPurchaseOrder();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US');
}

onMounted(loadApprovedPrOpenLines);
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