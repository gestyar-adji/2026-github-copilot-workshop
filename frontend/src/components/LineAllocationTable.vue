<template>
  <div class="card-panel allocation-card">
    <div class="card-panel-header">
      <p class="form-section-title" style="margin:0">Approved PR Lines</p>
      <button type="button" class="btn btn-outline refresh-btn">Refresh Open Lines</button>
    </div>

    <div class="allocation-table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:58px">Select</th>
            <th>PR No</th>
            <th style="width:62px">PR Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>UOM</th>
            <th>Requested QTY</th>
            <th>Allocated QTY</th>
            <th>Remaining QTY</th>
            <th>Order QTY</th>
            <th>Delivery Address</th>
            <th>Delivery Date</th>
            <th>Unit Price</th>
            <th>Line Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.prLineId">
            <td style="text-align:center">
              <label class="checkbox-field">
                <input v-model="line.selected" type="checkbox" />
                <img v-if="line.selected" src="../assets/figma-checkbox-checked.svg" alt="" />
              </label>
            </td>
            <td>{{ line.prNumber }}</td>
            <td>{{ line.prLineNo }}</td>
            <td>{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.uom }}</td>
            <td>{{ formatQty(line.qtyRequested) }}</td>
            <td>{{ formatQty(line.qtyAllocated) }}</td>
            <td>{{ formatQty(line.remainingQty) }}</td>
            <td>
              <input
                v-model.number="line.qtyOrdered"
                type="number"
                min="0.01"
                step="0.01"
                :max="line.remainingQty"
                :disabled="!line.selected"
              />
            </td>
            <td><input v-model="line.deliveryAddress" placeholder="Type..." :disabled="!line.selected" /></td>
            <td>
              <div class="date-field compact">
                <input v-model="line.deliveryDate" type="date" :disabled="!line.selected" />
                <img src="../assets/figma-calendar-today.svg" alt="" />
              </div>
            </td>
            <td>
              <input
                v-model.number="line.unitPrice"
                type="number"
                min="0"
                step="1"
                :disabled="!line.selected"
              />
            </td>
            <td>{{ formatAmount(line.qtyOrdered * line.unitPrice) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  lines: {
    type: Array,
    required: true,
  },
});

function formatQty(value) {
  return Number(value).toLocaleString('en-US');
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-US');
}
</script>

<style scoped>
.allocation-card {
  padding: 24px;
}

.refresh-btn {
  border-color: var(--primary);
  color: var(--text);
}

.allocation-table-wrap {
  overflow-x: auto;
}

.card-panel table {
  min-width: 1220px;
}

.card-panel table input[type='number'],
.card-panel table input[type='text'],
.card-panel table input[type='date'] {
  width: 100%;
  height: 45px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 5px;
  font-family: inherit;
  font-size: 13px;
}

.card-panel table input:focus {
  border-color: var(--primary);
  outline: none;
}

.checkbox-field {
  display: inline-flex;
  width: 16px;
  height: 16px;
  position: relative;
}

.checkbox-field input {
  appearance: none;
  border: 1px solid var(--primary);
  border-radius: 3px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  margin: 0;
}

.checkbox-field img {
  width: 16px;
  height: 16px;
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.date-field {
  position: relative;
}

.date-field input {
  padding-right: 34px;
}

.date-field img {
  width: 24px;
  height: 24px;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>