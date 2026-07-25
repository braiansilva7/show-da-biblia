<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Category, CategoryFormInput } from '@/types/category';

const props = defineProps<{
  modelValue: boolean;
  category: Category | null;
  error: string;
  isSaving: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [input: CategoryFormInput];
}>();
const form = ref<CategoryFormInput>({
  name: '',
  description: null,
  active: true,
});
const isEditing = computed(() => props.category !== null);

watch(
  () => [props.modelValue, props.category] as const,
  ([visible, category]) => {
    if (!visible) return;
    form.value = category
      ? {
          name: category.name,
          description: category.description,
          active: category.active,
        }
      : { name: '', description: null, active: true };
  },
  { immediate: true }
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="540"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="modal-card"
      ><v-card-text
        ><form @submit.prevent="emit('submit', form)">
          <header>
            <p class="eyebrow">
              {{ $t(isEditing ? 'edit_registration' : 'new_registration') }}
            </p>
            <h2>{{ $t(isEditing ? 'edit_category' : 'new_category') }}</h2>
            <p>{{ $t('category_form_subtitle') }}</p>
          </header>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <label
            ><span>{{ $t('category_name') }}</span
            ><input v-model="form.name" required maxlength="120"
          /></label>
          <label
            ><span>{{ $t('description') }}</span
            ><textarea
              v-model="form.description"
              class="category-description-input"
              maxlength="1000"
              rows="4"
              :placeholder="$t('category_description_placeholder')"
            />
          </label>
          <label v-if="isEditing"
            ><span>{{ $t('status') }}</span
            ><select v-model="form.active">
              <option :value="true">{{ $t('active') }}</option>
              <option :value="false">{{ $t('inactive') }}</option>
            </select></label
          >
          <footer>
            <v-btn
              type="button"
              variant="outlined"
              @click="emit('update:modelValue', false)"
              >{{ $t('cancel') }}</v-btn
            ><v-btn
              color="primary"
              type="submit"
              variant="flat"
              :loading="isSaving"
              >{{ $t(isEditing ? 'save_changes' : 'register') }}</v-btn
            >
          </footer>
        </form></v-card-text
      ></v-card
    >
  </v-dialog>
</template>

<style scoped>
.category-description-input {
  background: #fff;
  border: 1px solid #dbdae1;
  border-radius: 6px;
  color: #2f2b3d;
  display: block;
  font: inherit;
  line-height: 1.5;
  min-height: 110px;
  outline: 0;
  padding: 0.65rem 0.75rem;
  resize: vertical;
  width: 100%;
}
.category-description-input:focus {
  border-color: #7f4f24;
  box-shadow: 0 0 0 3px #7f4f2426;
}
</style>
