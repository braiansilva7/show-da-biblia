<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import UserDeleteDialog from '@/components/user/UserDeleteDialog.vue';
import UserFormDialog from '@/components/user/UserFormDialog.vue';
import type {
  ManagedUser,
  PermissionRole,
  UserFormInput,
  LanguageCode,
  Country,
} from '@/types/user';
import { formatDate } from '@/utils/formatters';
import { localeFromLanguage } from '@/utils/locale';

const props = defineProps<{
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  search: string;
  roles: PermissionRole[];
  countries: Country[];
  error: string;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string;
  isDeleting: boolean;
  saveUser: (
    input: UserFormInput,
    target: ManagedUser | null
  ) => Promise<boolean>;
  deleteUser: (user: ManagedUser) => Promise<boolean>;
}>();
const emit = defineEmits<{
  search: [options: { page?: number; search?: string; limit?: number }];
}>();
const { t, locale } = useI18n();
const isFormOpen = ref(false);
const editingUser = ref<ManagedUser | null>(null);
const userPendingDeletion = ref<ManagedUser | null>(null);
const searchTerm = ref(props.search);
let searchTimeout: ReturnType<typeof setTimeout> | undefined;
const totalPages = () => Math.max(1, Math.ceil(props.total / props.limit));

watch(searchTerm, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    emit('search', { page: 1, search: value });
  }, 300);
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
function languageLabel(language: LanguageCode) {
  return t(`language_${localeFromLanguage(language)}`);
}
function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}
function createUser() {
  editingUser.value = null;
  isFormOpen.value = true;
}
function changePage(value: number) {
  emit('search', { page: value, search: searchTerm.value });
}
function changeLimit(value: unknown) {
  emit('search', {
    page: 1,
    search: searchTerm.value,
    limit: Number(value),
  });
}
function editUser(user: ManagedUser) {
  editingUser.value = user;
  isFormOpen.value = true;
}
async function save(input: UserFormInput) {
  if (await props.saveUser(input, editingUser.value)) closeForm();
}
function closeForm() {
  isFormOpen.value = false;
  editingUser.value = null;
}
async function confirmDelete() {
  if (
    userPendingDeletion.value &&
    (await props.deleteUser(userPendingDeletion.value))
  )
    userPendingDeletion.value = null;
}
</script>

<template>
  <section class="page-content users-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">{{ $t('administration') }}</p>
        <h1>{{ $t('users') }}</h1>
        <p class="page-subtitle">{{ $t('users_subtitle') }}</p>
      </div>
      <v-btn color="primary" type="button" variant="flat" @click="createUser">{{
        $t('new_user')
      }}</v-btn>
    </div>
    <article class="data-card">
      <div class="data-card-header">
        <div>
          <h2>{{ $t('all_users') }}</h2>
          <p>{{ $t('users_found', { count: total }) }}</p>
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
            :placeholder="$t('users_search_placeholder')"
            :aria-label="$t('users_search_placeholder')"
          />
        </label>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-else-if="isLoading" class="empty-state">{{ $t('loading_users') }}</p>
      <p v-else-if="!users.length" class="empty-state">{{ $t('no_users') }}</p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ $t('user') }}</th>
              <th>{{ $t('role') }}</th>
              <th>{{ $t('language') }}</th>
              <th>{{ $t('status') }}</th>
              <th>{{ $t('registered_at') }}</th>
              <th>{{ $t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="managedUser in users" :key="managedUser.id">
              <td>
                <div class="user-summary">
                  <img
                    v-if="managedUser.profile_picture_url"
                    :src="managedUser.profile_picture_url"
                    :alt="managedUser.username"
                    class="user-avatar"
                  />
                  <span v-else class="user-avatar user-avatar-fallback">{{
                    initials(managedUser.username)
                  }}</span>
                  <div>
                    <strong>{{ managedUser.username }}</strong
                    ><span>{{ managedUser.email }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="tag role-tag">{{
                  managedUser.permission_role?.name ?? '-'
                }}</span>
              </td>
              <td>{{ languageLabel(managedUser.language_code) }}</td>
              <td>
                <span
                  :class="[
                    'tag',
                    managedUser.active ? 'active-tag' : 'inactive-tag',
                  ]"
                  >{{ $t(managedUser.active ? 'active' : 'inactive') }}</span
                >
              </td>
              <td>{{ formatDate(managedUser.created_at, locale) }}</td>
              <td class="row-actions">
                <v-tooltip :text="$t('edit')" location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      v-bind="tooltipProps"
                      class="row-action-button"
                      :aria-label="$t('edit')"
                      icon
                      type="button"
                      variant="text"
                      @click="editUser(managedUser)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5Z" />
                        <path d="m13.5 7 3.5 3.5" />
                      </svg>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip :text="$t('delete')" location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      v-bind="tooltipProps"
                      class="row-action-button danger-action"
                      :aria-label="$t('delete')"
                      icon
                      type="button"
                      variant="text"
                      @click="userPendingDeletion = managedUser"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 7h14M10 11v5M14 11v5M9 7l1-2h4l1 2M7 7l1 13h8l1-13" />
                      </svg>
                    </v-btn>
                  </template>
                </v-tooltip>
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
          :label="$t('users_per_page')"
          density="compact"
          hide-details
          variant="outlined"
          :disabled="isLoading"
          @update:model-value="changeLimit"
        />
        <div class="users-pagination-controls">
          <span>{{ $t('pagination_status', { page, total: totalPages() }) }}</span>
          <v-pagination
            :model-value="page"
            :length="totalPages()"
            :total-visible="5"
            density="compact"
            :disabled="isLoading"
            @update:model-value="changePage"
          />
        </div>
      </footer>
    </article>
    <UserFormDialog
      :model-value="isFormOpen"
      :user="editingUser"
      :roles="roles"
      :countries="countries"
      :error="saveError"
      :is-saving="isSaving"
      @update:model-value="
        (visible) => {
          if (!visible) closeForm();
        }
      "
      @submit="save"
    />
    <UserDeleteDialog
      :user="userPendingDeletion"
      :is-deleting="isDeleting"
      @close="userPendingDeletion = null"
      @confirm="confirmDelete"
    />
  </section>
</template>
