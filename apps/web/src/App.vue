<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LoginForm from '@/components/auth/LoginForm.vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import UsersPage from '@/pages/UsersPage.vue';
import { useManagerApi } from '@/composables/useManagerApi';
import type { Page } from '@/types/navigation';
import type { ManagedUser, UserFormInput } from '@/types/user';

const api = useManagerApi();
const {
  user,
  users,
  roles,
  countries,
  loginError,
  usersError,
  saveUserError,
  isLoggingIn,
  isLoadingUsers,
  isSavingUser,
  isDeletingUser,
  dashboardSummary,
  dashboardError,
  isLoadingDashboard,
} = api;
const currentPage = ref<Page>('dashboard');
const canManageUsers = computed(
  () => user.value?.permissions.includes('users.view') ?? false
);

async function openUsers() {
  if (!canManageUsers.value) return;
  currentPage.value = 'users';
  await Promise.all([api.loadUsers(), api.loadRoles(), api.loadCountries()]);
}

function navigate(page: Page) {
  if (page === 'users') void openUsers();
  else {
    currentPage.value = page;
    if (user.value?.permissions.includes('dashboard.view'))
      void api.loadDashboard();
  }
}

async function saveUser(input: UserFormInput, target: ManagedUser | null) {
  return api.saveUser(input, target);
}

async function deleteUser(user: ManagedUser) {
  return api.deleteUser(user);
}
function logout() {
  api.logout();
  currentPage.value = 'dashboard';
}

onMounted(async () => {
  await api.restoreSession();
  if (user.value?.permissions.includes('dashboard.view')) await api.loadDashboard();
});
</script>

<template>
  <v-app>
    <LoginForm
      v-if="!user"
      :error="loginError"
      :is-submitting="isLoggingIn"
      @submit="({ email, password }) => api.login(email, password)"
    />
    <AppLayout
      v-else
      :user="user"
      :current-page="currentPage"
      @navigate="navigate"
      @logout="logout"
    >
      <DashboardPage
        v-if="currentPage === 'dashboard'"
        :user="user"
        :summary="dashboardSummary"
        :error="dashboardError"
        :is-loading="isLoadingDashboard"
        :reload="api.loadDashboard"
        @open-users="openUsers"
      />
      <UsersPage
        v-else
        :users="users"
        :roles="roles"
        :countries="countries"
        :error="usersError"
        :is-loading="isLoadingUsers"
        :is-saving="isSavingUser"
        :save-error="saveUserError"
        :is-deleting="isDeletingUser"
        :save-user="saveUser"
        :delete-user="deleteUser"
        @refresh="api.loadUsers"
      />
    </AppLayout>
  </v-app>
</template>
