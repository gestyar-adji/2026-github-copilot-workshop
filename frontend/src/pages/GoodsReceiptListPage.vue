<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to dashboard">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipts</h2>
          <p class="muted">All goods receipt records</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="card-panel">
      <table>
        <thead>
          <tr>
            <th>GR Number</th>
            <th>PO Number</th>
            <th>Status</th>
            <th>Receipt Date</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><RouterLink :to="`/goods-receipts/${item.id}`">{{ item.grNumber }}</RouterLink></td>
            <td>{{ item.poNumber }}</td>
            <td>
              <span class="status-badge" :class="item.status.toLowerCase()">{{ item.status }}</span>
            </td>
            <td>{{ item.receiptDate || '-' }}</td>
            <td>{{ item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const items = ref([]);
const errorMessage = ref('');

onMounted(async () => {
  try {
    const payload = await api.listGoodsReceipts();
    items.value = payload.items || [];
  } catch (error) {
    errorMessage.value = error.message;
  }
});
</script>
