<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Detail Goods Receipt</h2>
          <p class="muted">{{ goodsReceipt?.grNumber || '-' }} &mdash; Goods receipt information detail</p>
        </div>
      </div>
      <div class="btn-group" v-if="goodsReceipt">
        <button v-if="goodsReceipt.status === 'DRAFT'" class="btn btn-primary" @click="postGoodsReceipt">Post GR</button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel" v-if="goodsReceipt">
      <p class="form-section-title">GR Header</p>
      <div class="form-row">
        <div class="form-group">
          <label>Purchase Order</label>
          <input :value="goodsReceipt.poNumber" disabled />
        </div>
        <div class="form-group">
          <label>GR Number</label>
          <input :value="goodsReceipt.grNumber" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <span class="status-badge" :class="goodsReceipt.status.toLowerCase()">{{ goodsReceipt.status }}</span>
        </div>
        <div class="form-group">
          <label>Receipt Date</label>
          <input :value="goodsReceipt.receiptDate || '-'" disabled />
        </div>
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea :value="goodsReceipt.notes || '-'" disabled rows="3" />
      </div>
    </div>

    <div class="card-panel" v-if="goodsReceipt">
      <p class="form-section-title">GR Lines</p>
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>UOM</th>
            <th>Qty Ordered</th>
            <th>Previously Received</th>
            <th>Receipt Qty</th>
            <th>Actual Site</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in goodsReceipt.lines" :key="line.id">
            <td>{{ line.lineNo }}</td>
            <td>{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.uom }}</td>
            <td>{{ line.qtyOrdered }}</td>
            <td>{{ line.qtyPreviouslyReceived }}</td>
            <td>{{ line.qtyReceived }}</td>
            <td>{{ line.actualSiteCode }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
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

async function postGoodsReceipt() {
  errorMessage.value = '';
  try {
    goodsReceipt.value = await api.postGoodsReceipt(route.params.id);
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
