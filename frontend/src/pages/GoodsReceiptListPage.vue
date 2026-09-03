<template>
  <div class="page">
    <div class="page-header">
      <h1>Goods Receipts</h1>
      <router-link
        :to="{ name: 'goods-receipts-create' }"
        class="btn btn-primary"
      >
        Create Goods Receipt
      </router-link>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      <p>No goods receipts yet.</p>
      <router-link :to="{ name: 'goods-receipts-create' }">Create one now</router-link>
    </div>

    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>GR Number</th>
            <th>PO Number</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Receipt Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="code">{{ item.grNumber }}</td>
            <td class="code">{{ item.poNumber }}</td>
            <td>{{ item.vendorName }}</td>
            <td>
              <span :class="['status-badge', `status-${item.status.toLowerCase()}`]">
                {{ item.status }}
              </span>
            </td>
            <td>{{ formatDate(item.receiptDate) }}</td>
            <td class="actions">
              <router-link
                :to="{ name: 'goods-receipts-detail', params: { id: item.id } }"
                class="link-action"
              >
                View
              </router-link>
              <button
                v-if="item.status === 'DRAFT'"
                @click="deleteGr(item.id)"
                class="link-action danger"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

const items = ref([]);
const error = ref(null);

onMounted(async () => {
  try {
    const response = await api.listGoodsReceipts();
    items.value = response.items || [];
  } catch (err) {
    error.value = err.message;
  }
});

const deleteGr = async (id) => {
  if (confirm('Are you sure you want to delete this goods receipt?')) {
    try {
      // TODO: Implement delete endpoint
      alert('Delete not yet implemented');
    } catch (err) {
      error.value = err.message;
    }
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
};
</script>

<style scoped>
.page {
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  color: var(--color-heading);
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  color: var(--color-text-secondary);
}

.empty-state a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.empty-state a:hover {
  text-decoration: underline;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table thead {
  background-color: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border);
}

.data-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-heading);
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.code {
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-draft {
  background-color: #fef3c7;
  color: #92400e;
}

.status-posted {
  background-color: #d1fae5;
  color: #065f46;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.link-action {
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  transition: all 0.2s;
}

.link-action:hover {
  text-decoration: underline;
}

.link-action.danger {
  color: #dc2626;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #991b1b;
  font-size: 0.9rem;
}
</style>
