<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to dashboard">
          <span aria-hidden="true">&#8592;</span>
        </RouterLink>
        <div>
          <h2>Receive Goods</h2>
          <p class="muted">Create a goods receipt against a submitted purchase order</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

    <form @submit.prevent="handleSubmit">
      <!-- PO Selection Card -->
      <div class="card-panel">
        <p class="form-section-title">Select Purchase Order</p>
        <div class="form-row">
          <div class="form-group">
            <label for="po-select">Purchase Order *</label>
            <select
              id="po-select"
              v-model="selectedPoId"
              @change="handlePoChange"
              required
            >
              <option value="">-- Choose a PO --</option>
              <option v-for="po in availablePOs" :key="po.id" :value="po.id">
                {{ po.poNumber }} – {{ po.vendorName }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- GR Header -->
      <div v-if="selectedPo" class="card-panel">
        <p class="form-section-title">Goods Receipt Header</p>
        <div class="form-row">
          <div class="form-group">
            <label>PO Reference</label>
            <input :value="selectedPo.poNumber" disabled />
          </div>
          <div class="form-group">
            <label>Vendor</label>
            <input :value="selectedPo.vendorName" disabled />
          </div>
          <div class="form-group">
            <label for="receipt-date">Receipt Date</label>
            <input
              id="receipt-date"
              v-model="grHeader.receiptDate"
              type="date"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="grid-column: 1 / -1">
            <label for="notes">Notes</label>
            <textarea
              id="notes"
              v-model="grHeader.notes"
              rows="3"
              placeholder="Add any notes about the receipt (condition, discrepancies, etc.)"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Line Items -->
      <GRLineAllocationTable
        v-if="selectedPo && poLines.length > 0"
        :lines="poLines"
      />

      <div v-if="selectedPo && poLines.length === 0" class="empty-state">
        <p>This PO has no open lines to receive. All items may have been already received.</p>
      </div>

      <!-- Summary -->
      <div v-if="selectedPo && poLines.length > 0" class="card-panel">
        <div class="summary-panel">
          <div>
            <span class="muted">Lines to Receive</span>
            <strong>{{ selectedLines.length }}</strong>
          </div>
          <div>
            <span class="muted">Estimated Total Cost</span>
            <strong>{{ formatCurrency(totalCost) }}</strong>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="selectedPo && poLines.length > 0" class="btn-group">
        <RouterLink to="/" class="btn btn-outline">Cancel</RouterLink>
        <button class="btn btn-secondary" type="submit">Save as Draft</button>
        <button class="btn btn-primary" type="button" @click="handleSubmitAndPost">
          Create & Post Receipt
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { api } from '../api';
import GRLineAllocationTable from '../components/GRLineAllocationTable.vue';

const router = useRouter();
const errorMessage = ref('');
const successMessage = ref('');
const availablePOs = ref([]);
const selectedPoId = ref('');
const selectedPo = ref(null);
const poLines = ref([]);
const submitMode = ref('draft'); // 'draft' or 'post'

const grHeader = ref({
  receiptDate: new Date().toISOString().split('T')[0],
  notes: '',
});

const selectedLines = computed(() => poLines.value.filter((line) => Number(line.qtyReceived) > 0));
const totalCost = computed(() =>
  selectedLines.value.reduce((sum, line) => sum + Number(line.qtyReceived) * Number(line.unitPrice), 0)
);

async function loadAvailablePOs() {
  try {
    errorMessage.value = '';
    const response = await api.listPurchaseOrders();
    availablePOs.value = (response.items || []).filter((po) => po.status === 'SUBMITTED');

    if (availablePOs.value.length === 0) {
      errorMessage.value = 'No submitted purchase orders available for receiving.';
    }
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function handlePoChange() {
  try {
    errorMessage.value = '';
    if (!selectedPoId.value) {
      selectedPo.value = null;
      poLines.value = [];
      return;
    }

    const po = await api.getPurchaseOrder(selectedPoId.value);
    selectedPo.value = po;

    // Get open lines
    const payload = await api.getPurchaseOrderOpenLines(selectedPoId.value);
    poLines.value = (payload?.openLines || []).map((line) => ({
      ...line,
      qtyReceived: 0,
      actualSiteCode: line.siteCode || '',
    }));
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function validateForm() {
  if (!selectedPoId.value) {
    return 'Please select a purchase order.';
  }

  if (selectedLines.value.length === 0) {
    return 'Please enter a receive quantity for at least one line.';
  }

  for (const line of selectedLines.value) {
    if (Number(line.qtyReceived) <= 0) {
      return `${line.itemCode} receive quantity must be greater than 0.`;
    }
    if (Number(line.qtyReceived) > Number(line.qtyOpenForGr)) {
      return `${line.itemCode} receive quantity exceeds open quantity.`;
    }
  }

  return '';
}

function buildGoodsReceiptPayload() {
  return {
    poId: selectedPoId.value,
    receiptDate: grHeader.value.receiptDate || null,
    notes: grHeader.value.notes || '',
    lines: selectedLines.value.map((line) => ({
      poLineId: line.id,
      qtyReceived: Number(line.qtyReceived),
      actualSiteCode: line.actualSiteCode || line.siteCode || '',
    })),
  };
}

async function createGoodsReceipt() {
  errorMessage.value = '';
  successMessage.value = '';

  const validationError = validateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return null;
  }

  try {
    const payload = buildGoodsReceiptPayload();
    const created = await api.createGoodsReceipt(payload);
    successMessage.value = `Goods receipt ${created.grNumber} created successfully.`;

    // If user wants to post immediately, do it
    if (submitMode.value === 'post') {
      const posted = await api.postGoodsReceipt(created.id);
      successMessage.value += ' Receipt has been posted.';
      return posted;
    }

    return created;
  } catch (error) {
    errorMessage.value = error.message || 'Unable to create goods receipt.';
    return null;
  }
}

async function handleSubmit() {
  submitMode.value = 'draft';
  const created = await createGoodsReceipt();
  if (created) {
    await router.push(`/goods-receipts/${created.id}`);
  }
}

async function handleSubmitAndPost() {
  submitMode.value = 'post';
  const created = await createGoodsReceipt();
  if (created) {
    await router.push(`/goods-receipts/${created.id}`);
  }
}

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

onMounted(loadAvailablePOs);
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-header-left {
  display: flex;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--color-text);
  text-decoration: none;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: var(--color-border);
}

.page-header-left h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-heading);
}

.page-header-left p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.card-panel {
  background-color: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-section-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  background-color: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 100, 200, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.summary-panel {
  background-color: var(--color-bg-secondary);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  padding: 1rem;
}

.summary-panel > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-panel .muted {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.summary-panel strong {
  font-size: 1.1rem;
  color: var(--color-heading);
}

.btn-group {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-outline {
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-outline:hover {
  background-color: var(--color-bg-secondary);
}

.btn-secondary {
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-bg-secondary);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background-color: #0066cc;
  border-color: #0066cc;
}

.error {
  padding: 0.75rem 1rem;
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #991b1b;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.success-message {
  padding: 0.75rem 1rem;
  background-color: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 4px;
  color: #065f46;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.muted {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>
