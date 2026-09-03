<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders/new" class="back-btn" title="Back to create">
          <span aria-hidden="true">&#8592;</span>
        </RouterLink>
        <div>
          <h2>Detail Purchase Order</h2>
          <p class="muted">{{ purchaseOrder?.poNumber || '-' }} &mdash; Purchase order information detail</p>
        </div>
      </div>
      <div class="btn-group" v-if="purchaseOrder">
        <button v-if="purchaseOrder.status === 'DRAFT'" class="btn btn-primary" @click="submitPurchaseOrder">Submit PO</button>
        <RouterLink v-if="canCreateGoodsReceipt" class="btn btn-primary" :to="`/goods-receipts/new/${purchaseOrder.id}`">Create GR</RouterLink>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel" v-if="purchaseOrder">
      <p class="form-section-title">PO Header</p>
      <div class="form-row">
        <div class="form-group">
          <label>Vendor</label>
          <input :value="purchaseOrder.vendorName" disabled />
        </div>
        <div class="form-group">
          <label>PO Number</label>
          <input :value="purchaseOrder.poNumber" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <span class="status-badge" :class="purchaseOrder.status.toLowerCase()">{{ purchaseOrder.status }}</span>
        </div>
        <div class="form-group">
          <label>Created At</label>
          <input :value="purchaseOrder.createdAt || '-'" disabled />
        </div>
      </div>
    </div>

    <div class="card-panel" v-if="purchaseOrder">
      <p class="form-section-title">PO Lines</p>
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Qty Ordered</th>
            <th>Qty Received</th>
            <th>Open Qty</th>
            <th>UOM</th>
            <th>Unit Price</th>
            <th>Site</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in purchaseOrder.lines" :key="line.id">
            <td>{{ line.lineNo }}</td>
            <td>{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.qtyOrdered }}</td>
            <td>{{ line.qtyReceived }}</td>
            <td>{{ line.qtyOpenForGr }}</td>
            <td>{{ line.uom }}</td>
            <td>{{ line.unitPrice }}</td>
            <td>{{ line.siteCode }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const purchaseOrder = ref(null);
const errorMessage = ref('');

const canCreateGoodsReceipt = computed(() =>
  Boolean(
    purchaseOrder.value &&
      purchaseOrder.value.status === 'SUBMITTED' &&
      purchaseOrder.value.lines.some((line) => line.qtyOpenForGr > 0)
  )
);

async function load() {
  errorMessage.value = '';
  try {
    purchaseOrder.value = await api.getPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function submitPurchaseOrder() {
  try {
    purchaseOrder.value = await api.submitPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

onMounted(load);
</script>

<style scoped>
.form-group input:disabled,
.form-group textarea:disabled {
  background: var(--white);
  color: var(--text);
  cursor: default;
  opacity: 1;
}
</style>
