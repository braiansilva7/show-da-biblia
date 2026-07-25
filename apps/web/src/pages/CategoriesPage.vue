<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import CategoryDeleteDialog from '@/components/category/CategoryDeleteDialog.vue';
import CategoryFormDialog from '@/components/category/CategoryFormDialog.vue';
import type { Category, CategoryFormInput } from '@/types/category';
import type { PermissionAction } from '@/types/user';

const props = defineProps<{
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  search: string;
  permissions: PermissionAction[];
  error: string;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string;
  isDeleting: boolean;
  saveCategory: (
    input: CategoryFormInput,
    target: Category | null
  ) => Promise<boolean>;
  deleteCategory: (category: Category) => Promise<boolean>;
}>();
const emit = defineEmits<{
  search: [options: { page?: number; search?: string; limit?: number }];
}>();
const isFormOpen = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryPendingDeletion = ref<Category | null>(null);
const searchTerm = ref(props.search);
let searchTimeout: ReturnType<typeof setTimeout> | undefined;
const canCreate = computed(() =>
  props.permissions.includes('categories.create')
);
const canUpdate = computed(() =>
  props.permissions.includes('categories.update')
);
const canDelete = computed(() =>
  props.permissions.includes('categories.delete')
);
const totalPages = () => Math.max(1, Math.ceil(props.total / props.limit));

watch(searchTerm, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(
    () => emit('search', { page: 1, search: value }),
    300
  );
});
watch(
  () => props.search,
  (value) => {
    if (value !== searchTerm.value) searchTerm.value = value;
  }
);
onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
});
function openCreate() {
  editingCategory.value = null;
  isFormOpen.value = true;
}
function openEdit(category: Category) {
  editingCategory.value = category;
  isFormOpen.value = true;
}
function closeForm() {
  isFormOpen.value = false;
  editingCategory.value = null;
}
async function save(input: CategoryFormInput) {
  if (await props.saveCategory(input, editingCategory.value)) closeForm();
}
async function confirmDelete() {
  if (
    categoryPendingDeletion.value &&
    (await props.deleteCategory(categoryPendingDeletion.value))
  )
    categoryPendingDeletion.value = null;
}
</script>

<template>
  <section class="page-content users-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">{{ $t('administration') }}</p>
        <h1>{{ $t('categories') }}</h1>
        <p class="page-subtitle">{{ $t('categories_subtitle') }}</p>
      </div>
      <v-btn
        v-if="canCreate"
        color="primary"
        type="button"
        variant="flat"
        @click="openCreate"
        >{{ $t('new_category') }}</v-btn
      >
    </div>
    <article class="data-card">
      <div class="data-card-header">
        <div>
          <h2>{{ $t('all_categories') }}</h2>
          <p>{{ $t('categories_found', { count: total }) }}</p>
        </div>
        <label class="users-filter">
          <svg
            class="users-filter-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <input
            v-model="searchTerm"
            type="search"
            :placeholder="$t('categories_search_placeholder')"
            :aria-label="$t('categories_search_placeholder')"
          />
        </label>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-else-if="isLoading" class="empty-state">
        {{ $t('loading_categories') }}
      </p>
      <p v-else-if="!categories.length" class="empty-state">
        {{ $t('no_categories') }}
      </p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ $t('category_name') }}</th>
              <th>{{ $t('description') }}</th>
              <th>{{ $t('status') }}</th>
              <th v-if="canUpdate || canDelete">{{ $t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="category in categories" :key="category.id">
              <td>
                <strong>{{ category.name }}</strong>
              </td>
              <td>{{ category.description || '-' }}</td>
              <td>
                <span
                  :class="[
                    'tag',
                    category.active ? 'active-tag' : 'inactive-tag',
                  ]"
                  >{{ $t(category.active ? 'active' : 'inactive') }}</span
                >
              </td>
              <td v-if="canUpdate || canDelete" class="row-actions">
                <v-tooltip v-if="canUpdate" :text="$t('edit')" location="top"
                  ><template #activator="{ props: tooltipProps }"
                    ><v-btn
                      v-bind="tooltipProps"
                      class="row-action-button"
                      :aria-label="$t('edit')"
                      icon
                      type="button"
                      variant="text"
                      @click="openEdit(category)"
                      ><svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5Z" />
                        <path
                          d="m13.5 7 3.5 3.5"
                        /></svg></v-btn></template></v-tooltip
                ><v-tooltip v-if="canDelete" :text="$t('delete')" location="top"
                  ><template #activator="{ props: tooltipProps }"
                    ><v-btn
                      v-bind="tooltipProps"
                      class="row-action-button danger-action"
                      :aria-label="$t('delete')"
                      icon
                      type="button"
                      variant="text"
                      @click="categoryPendingDeletion = category"
                      ><svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M5 7h14M10 11v5M14 11v5M9 7l1-2h4l1 2M7 7l1 13h8l1-13"
                        /></svg></v-btn></template
                ></v-tooltip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="users-pagination">
        <v-select
          class="users-per-page"
          :model-value="limit"
          :items="[10, 20, 50]"
          :label="$t('categories_per_page')"
          density="compact"
          hide-details
          variant="outlined"
          :disabled="isLoading"
          @update:model-value="
            (value) =>
              emit('search', {
                page: 1,
                search: searchTerm,
                limit: Number(value),
              })
          "
        />
        <div class="users-pagination-controls">
          <span>{{
            $t('pagination_status', { page, total: totalPages() })
          }}</span
          ><v-pagination
            :model-value="page"
            :length="totalPages()"
            :total-visible="5"
            density="compact"
            :disabled="isLoading"
            @update:model-value="
              (value) => emit('search', { page: value, search: searchTerm })
            "
          />
        </div>
      </footer>
    </article>
    <CategoryFormDialog
      :model-value="isFormOpen"
      :category="editingCategory"
      :error="saveError"
      :is-saving="isSaving"
      @update:model-value="
        (visible) => {
          if (!visible) closeForm();
        }
      "
      @submit="save"
    />
    <CategoryDeleteDialog
      :category="categoryPendingDeletion"
      :is-deleting="isDeleting"
      @close="categoryPendingDeletion = null"
      @confirm="confirmDelete"
    />
  </section>
</template>
