<template>
  <div class="card-panel allocation-card">
    <div class="card-panel-header">
      <p class="form-section-title" style="margin: 0">Receive Items from PO</p>
    </div>

    <div v-if="lines.length === 0" class="empty-message">
      <p>No items available to receive.</p>
    </div>

    <div v-else class="allocation-table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width: 62px">Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>UOM</th>
            <th>Qty Ordered</th>
            <th>Already Received</th>
            <th>Open Qty</th>
            <th>Receive Now</th>
            <th>Site Code</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.id" :class="{ 'has-error': lineErrors[line.id] }">
            <td>{{ line.lineNo }}</td>
            <td class="code">{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.uom }}</td>
            <td class="number">{{ formatQty(line.qtyOrdered) }}</td>
            <td class="number">{{ formatQty(line.qtyAlreadyReceived) }}</td>
            <td class="number">{{ formatQty(line.qtyOpenForGr) }}</td>
            <td>
              <input
                v-model.number="line.qtyReceived"
                type="number"
                min="0.01"
                step="0.01"
                :max="line.qtyOpenForGr"
                @blur="validateLine(line)"
                class="qty-input"
              />
              <span v-if="lineErrors[line.id]" class="error-text">
                {{ lineErrors[line.id] }}
              </span>
            </td>
            <td>
              <input v-model="line.actualSiteCode" type="text" placeholder="e.g., WH-JKT" class="text-input" />
            </td>
            <td class="number">{{ formatCurrency(line.unitPrice) }}</td>
            <td class="number font-bold">{{ formatCurrency(line.qtyReceived * line.unitPrice) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  lines: {
    type: Array,
    required: true,
  },
});

const lineErrors = ref({});

const formatQty = (value) => {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const validateLine = (line) => {
  if (!lineErrors[line.id]) {
    lineErrors.value[line.id] = null;
  }

  if (Number(line.qtyReceived) > Number(line.qtyOpenForGr)) {
    lineErrors.value[line.id] = `Cannot receive more than ${line.qtyOpenForGr} ${line.uom}`;
  } else if (Number(line.qtyReceived) <= 0) {
    lineErrors.value[line.id] = 'Received qty must be greater than 0';
  } else {
    lineErrors.value[line.id] = null;
  }
};
</script>

<style scoped>
.allocation-card {
  padding: 1.5rem;
}

.card-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.form-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-message {
  text-align: center;
  padding: 2rem;
  background-color: var(--color-bg-secondary);
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.allocation-table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
  font-size: 0.9rem;
}

thead {
  background-color: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border);
}

th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  font-size: 0.8rem;
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

tbody tr.has-error {
  background-color: #fef3c7;
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

.qty-input,
.text-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.qty-input:focus,
.text-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 100, 200, 0.1);
}

.qty-input:disabled,
.text-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.error-text {
  display: block;
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-weight: 500;
}
</style>
