<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink :to="`/purchase-orders/${poId}`" class="back-btn" title="Back to PO detail">&#8592;</RouterLink>
        <div>
          <h2>Create Goods Receipt</h2>
          <p class="muted">Receive items against {{ purchaseOrder?.poNumber || 'purchase order' }}'s open lines</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

    <form v-if="lines.length" @submit.prevent="handleSubmit">
      <div class="card-panel gr-header-card">
        <p class="form-section-title">GR Header</p>
        <div class="form-row">
          <div class="form-group">
            <label>Purchase Order</label>
            <input :value="purchaseOrder?.poNumber" disabled />
          </div>
          <div class="form-group">
            <label>Receipt Date</label>
            <input v-model="header.receiptDate" type="date" required />
          </div>
        </div>
        <div class="form-group full">
          <label>Notes</label>
          <textarea v-model="header.notes" placeholder="Type..." rows="3" />
        </div>
      </div>

      <div class="card-panel gr-lines-card">
        <p class="form-section-title">Open PO Lines</p>
        <table>
          <thead>
            <tr>
              <th style="width:58px">Select</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>UOM</th>
              <th>Qty Ordered</th>
              <th>Open Qty</th>
              <th>Receipt Qty</th>
              <th>Actual Site</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.poLineId">
              <td style="text-align:center">
                <input v-model="line.selected" type="checkbox" />
              </td>
              <td>{{ line.itemCode }}</td>
              <td>{{ line.itemName }}</td>
              <td>{{ line.uom }}</td>
              <td>{{ line.qtyOrdered }}</td>
              <td>{{ line.qtyOpenForGr }}</td>
              <td>
                <input
                  v-model.number="line.qtyReceived"
                  type="number"
                  min="0.01"
                  step="0.01"
                  :max="line.qtyOpenForGr"
                  :disabled="!line.selected"
                />
              </td>
              <td><input v-model="line.actualSiteCode" placeholder="Type..." :disabled="!line.selected" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-group">
        <RouterLink :to="`/purchase-orders/${poId}`" class="btn btn-outline">Cancel</RouterLink>
        <button class="btn btn-primary" type="submit">Save As Draft</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { api } from '../api';

const props = defineProps({
  poId: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const purchaseOrder = ref(null);
const errorMessage = ref('');
const successMessage = ref('');

const header = ref({
  receiptDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

const lines = reactive([]);

const selectedLines = computed(() => lines.filter((line) => line.selected));

function normalizeOpenLine(line) {
  return {
    poLineId: line.id,
    itemCode: line.itemCode,
    itemName: line.itemName,
    uom: line.uom,
    qtyOrdered: Number(line.qtyOrdered || 0),
    qtyOpenForGr: Number(line.qtyOpenForGr || 0),
    qtyReceived: 0,
    actualSiteCode: line.siteCode || '',
    selected: true,
  };
}

async function loadOpenLines() {
  errorMessage.value = '';
  try {
    purchaseOrder.value = await api.getPurchaseOrder(props.poId);
    const payload = await api.getPurchaseOrderOpenLines(props.poId);
    const openLines = (payload?.openLines || []).map(normalizeOpenLine);
    lines.splice(0, lines.length, ...openLines);

    if (lines.length === 0) {
      errorMessage.value = 'This purchase order has no open lines available for receiving.';
    }
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function validateForm() {
  if (!header.value.receiptDate) {
    return 'Receipt date is required.';
  }

  if (selectedLines.value.length === 0) {
    return 'Select at least one PO line.';
  }

  const invalidLine = selectedLines.value.find(
    (line) => Number(line.qtyReceived) <= 0 || !line.actualSiteCode.trim()
  );

  if (invalidLine) {
    return `${invalidLine.itemCode} requires a receipt quantity greater than zero and an actual site.`;
  }

  return '';
}

function buildGoodsReceiptPayload() {
  return {
    poId: props.poId,
    receiptDate: header.value.receiptDate,
    notes: header.value.notes || null,
    lines: selectedLines.value.map((line) => ({
      poLineId: line.poLineId,
      qtyReceived: Number(line.qtyReceived),
      actualSiteCode: line.actualSiteCode.trim(),
    })),
  };
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  const validationError = validateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  try {
    const payload = buildGoodsReceiptPayload();
    const created = await api.createGoodsReceipt(payload);
    successMessage.value = `Goods receipt ${created.grNumber || created.id} created successfully.`;
    await router.push(`/goods-receipts/${created.id}`);
  } catch (error) {
    errorMessage.value = error.message || 'Unable to create goods receipt.';
  }
}

onMounted(loadOpenLines);
</script>

<style scoped>
.gr-header-card {
  padding: 24px;
}

.success-message {
  color: #2e7d32;
  font-size: 13px;
}
</style>
