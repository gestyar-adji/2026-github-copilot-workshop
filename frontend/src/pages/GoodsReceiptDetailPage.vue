<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to list">
          <span aria-hidden="true">&#8592;</span>
        </RouterLink>
        <div>
          <h2>Goods Receipt Detail</h2>
          <p class="muted">{{ goodsReceipt?.grNumber || '-' }} &mdash; Goods receipt information and tracking</p>
        </div>
      </div>
      <div class="btn-group" v-if="goodsReceipt">
        <button v-if="goodsReceipt.status === 'DRAFT'" class="btn btn-primary" @click="postReceipt">
          Post Receipt
        </button>
        <button v-if="goodsReceipt.status === 'DRAFT'" class="btn btn-secondary" @click="deleteReceipt">
          Delete
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel" v-if="goodsReceipt">
      <p class="form-section-title">GR Header</p>
      <div class="form-row">
        <div class="form-group">
          <label>GR Number</label>
          <input :value="goodsReceipt.grNumber" disabled />
        </div>
        <div class="form-group">
          <label>PO Reference</label>
          <router-link
            :to="{ name: 'purchase-orders-detail', params: { id: goodsReceipt.poId } }"
            class="link-ref"
          >
            {{ goodsReceipt.poNumber }}
          </router-link>
        </div>
        <div class="form-group">
          <label>Vendor</label>
          <input :value="goodsReceipt.vendorName" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <span class="status-badge" :class="goodsReceipt.status.toLowerCase()">
            {{ goodsReceipt.status }}
          </span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Receipt Date</label>
          <input :value="goodsReceipt.receiptDate || '-'" disabled />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea :value="goodsReceipt.notes || ''" disabled rows="3"></textarea>
        </div>
      </div>
    </div>

    <div class="card-panel" v-if="goodsReceipt">
      <p class="form-section-title">Received Items</p>
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Qty Ordered</th>
            <th>Already Received</th>
            <th>Received Now</th>
            <th>UOM</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in goodsReceipt.lines" :key="line.id">
            <td>{{ line.lineNo }}</td>
            <td class="code">{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td class="number">{{ formatNumber(line.qtyOrdered) }}</td>
            <td class="number">{{ formatNumber(line.qtyAlreadyReceived) }}</td>
            <td class="number font-bold">{{ formatNumber(line.qtyReceived) }}</td>
            <td>{{ line.uom }}</td>
            <td class="number">{{ formatCurrency(line.unitPrice) }}</td>
            <td class="number font-bold">{{ formatCurrency(line.lineCost) }}</td>
          </tr>
          <tr class="total-row">
            <td colspan="8" style="text-align: right; font-weight: 600;">Total Cost:</td>
            <td class="number font-bold">{{ formatCurrency(goodsReceipt.totalCost) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card-panel" v-if="goodsReceipt">
      <p class="form-section-title">Purchase Requisition Link</p>
      <p class="muted">
        This GR is linked to PO <strong>{{ goodsReceipt.poNumber }}</strong>.
        <router-link
          :to="{ name: 'purchase-orders-detail', params: { id: goodsReceipt.poId } }"
          class="link-action"
        >
          View the PO details
        </router-link>
        to see how this receipt fulfills the original purchase requisition.
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const router = useRouter();
const goodsReceipt = ref(null);
const errorMessage = ref('');

async function load() {
  errorMessage.value = '';
  try {
    goodsReceipt.value = await api.getGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function postReceipt() {
  if (!confirm('Are you sure you want to post this goods receipt? This action cannot be undone.')) {
    return;
  }

  try {
    goodsReceipt.value = await api.postGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function deleteReceipt() {
  if (!confirm('Are you sure you want to delete this goods receipt?')) {
    return;
  }

  try {
    // TODO: Implement delete endpoint
    alert('Delete not yet implemented');
  } catch (error) {
    errorMessage.value = error.message;
  }
}

const formatNumber = (num) => {
  return Number(num).toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

const formatCurrency = (num) => {
  return Number(num).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
};

onMounted(load);
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.page-header-left {
  display: flex;
  gap: 1rem;
  flex: 1;
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

.btn-group {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.btn-secondary {
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-secondary:hover {
  background-color: #fee2e2;
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
  margin-bottom: 1rem;
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
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #f9f9f9;
  color: var(--color-text);
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
}

.status-badge.draft {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge.posted {
  background-color: #d1fae5;
  color: #065f46;
}

.link-ref {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  font-family: monospace;
  font-size: 0.9rem;
}

.link-ref:hover {
  text-decoration: underline;
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

.muted {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.link-action {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.link-action:hover {
  text-decoration: underline;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

table thead {
  background-color: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border);
}

table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  font-size: 0.8rem;
}

table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.code {
  font-family: monospace;
  font-weight: 500;
  font-size: 0.85rem;
}

.number {
  text-align: right;
  font-family: 'Courier New', monospace;
}

.font-bold {
  font-weight: 600;
}

.total-row {
  background-color: var(--color-bg-secondary);
  font-weight: 600;
}

.total-row td {
  border-top: 2px solid var(--color-border);
  border-bottom: 2px solid var(--color-border);
}
</style>
