<template>
  <div class="card-panel po-header-card">
    <p class="form-section-title">PO Header</p>
    <div class="form-row">
      <div class="form-group">
        <label>Vendor</label>
        <input v-model="draft.vendorName" placeholder="Type..." required />
      </div>
      <div class="form-group">
        <label>Needed By date</label>
        <div class="date-field">
          <input v-model="draft.neededByDate" type="date" />
          <img src="../assets/figma-calendar-today.svg" alt="" />
        </div>
      </div>
      <div class="form-group">
        <label>Currency</label>
        <input v-model="draft.currency" placeholder="IDR..." />
      </div>
      <div class="form-group">
        <label>Payment Terms</label>
        <input v-model="draft.paymentTerms" placeholder="Type..." />
      </div>
    </div>
    <div class="form-group full">
      <label>Notes</label>
      <textarea v-model="draft.notes" placeholder="Type..." rows="3" />
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const draft = reactive({ ...props.modelValue });

watch(
  draft,
  () => {
    emit('update:modelValue', { ...draft });
  },
  { deep: true }
);
</script>

<style scoped>
.po-header-card {
  padding: 24px;
}

.date-field {
  position: relative;
}

.date-field input {
  width: 100%;
  padding-right: 42px;
}

.date-field img {
  width: 24px;
  height: 24px;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>