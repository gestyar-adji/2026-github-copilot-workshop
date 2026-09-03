<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/requisitions" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Create Purchase Requisition</h2>
          <p class="muted">Create PR with header information and line items</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <form @submit.prevent="handleSubmit">
      <!-- PR Header card -->
      <div class="card-panel">
        <p class="form-section-title">PR Header</p>
        <div class="form-row">
          <div class="form-group">
            <label>Requester Name</label>
            <input v-model="form.requesterName" placeholder="Type..." required />
          </div>
          <div class="form-group">
            <label>Department</label>
            <input v-model="form.departmentName" placeholder="Type..." required />
          </div>
          <div class="form-group">
            <label>PR Title</label>
            <input v-model="form.title" placeholder="Type..." required />
          </div>
          <div class="form-group">
            <label>Needed By date</label>
            <input v-model="form.neededByDate" type="date" />
          </div>
        </div>
        <div class="form-group full">
          <label>Notes</label>
          <textarea v-model="form.notes" placeholder="Type..." rows="3" />
        </div>
      </div>

      <!-- PR Lines card -->
      <div class="card-panel">
        <div class="card-panel-header">
          <p class="form-section-title" style="margin:0">PR Lines</p>
          <button type="button" class="btn btn-outline" @click="addLine">+ New Line</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:50px">Line</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th style="width:90px">QTY</th>
              <th style="width:80px">UOM</th>
              <th>Est. Unit Price</th>
              <th>Site</th>
              <th>Required Date</th>
              <th>Budget Center</th>
              <th style="width:60px">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in form.lines" :key="index">
              <td>{{ index + 1 }}</td>
              <td><input v-model="line.itemCode" placeholder="Type..." required /></td>
              <td><input v-model="line.itemName" placeholder="Type..." required /></td>
              <td><input v-model.number="line.qtyRequested" type="number" min="0.01" step="0.01" placeholder="Type..." required /></td>
              <td><input v-model="line.uom" placeholder="Type..." required /></td>
              <td><input v-model.number="line.estUnitPrice" type="number" min="0" step="0.01" placeholder="Type..." required /></td>
              <td><input v-model="line.siteCode" placeholder="Type..." required /></td>
              <td><input v-model="line.requiredDate" type="date" /></td>
              <td><input v-model="line.budgetCenter" placeholder="Type..." /></td>
              <td style="text-align:center">
                <button type="button" class="btn-danger-icon" @click="removeLine(index)" title="Remove"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 1.5h5M2 3.5h12M3.5 3.5l.75 9.5a1.5 1.5 0 0 0 1.5 1.5h4.5a1.5 1.5 0 0 0 1.5-1.5l.75-9.5M6.5 6.5v4.5M9.5 6.5v4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Action buttons -->
      <div class="btn-group">
        <RouterLink to="/requisitions" class="btn btn-outline">Cancel</RouterLink>
        <button class="btn btn-primary" type="submit">Save As Draft</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { api } from '../api';

const router = useRouter();
const errorMessage = ref('');

function emptyLine() {
  return {
    itemCode: '',
    itemName: '',
    qtyRequested: 1,
    uom: 'PCS',
    estUnitPrice: 0,
    siteCode: '',
    requiredDate: '',
    budgetCenter: '',
  };
}

const form = reactive({
  requesterName: '',
  departmentName: '',
  title: '',
  neededByDate: '',
  notes: '',
  lines: [emptyLine()],
});

function addLine() {
  form.lines.push(emptyLine());
}

function removeLine(index) {
  if (form.lines.length === 1) return;
  form.lines.splice(index, 1);
}

async function handleSubmit() {
  errorMessage.value = '';
  try {
    const payload = {
      ...form,
      lines: form.lines.map((line) => ({ ...line })),
    };
    const created = await api.createRequisition(payload);
    await router.push(`/requisitions/${created.id}`);
  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>

<style scoped>
.card-panel table input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-family: inherit;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
}
.card-panel table input:focus {
  border-color: var(--primary);
  outline: none;
}
</style>
