<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

type UserRole = 'ADMIN' | 'PLAYER';
type LanguageCode = 'pt-BR' | 'en' | 'es';

type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  language_code: LanguageCode;
};

type ManagedUser = AuthenticatedUser & {
  active: boolean;
  created_at: string;
  country_id?: string | null;
  profile_picture_url?: string | null;
  total_score?: number;
};

type LoginResponse = {
  access_token: string;
  user: AuthenticatedUser;
};

type Page = 'dashboard' | 'users';

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const tokenStorageKey = 'show-da-biblia.access-token';
const { locale, t } = useI18n();
const email = ref('');
const password = ref('');
const isPasswordVisible = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');
const user = ref<AuthenticatedUser | null>(null);
const currentPage = ref<Page>('dashboard');
const users = ref<ManagedUser[]>([]);
const isLoadingUsers = ref(false);
const usersError = ref('');
const isCreateDialogOpen = ref(false);
const isCreatingUser = ref(false);
const createUserError = ref('');
const editingUser = ref<ManagedUser | null>(null);
const userPendingDeletion = ref<ManagedUser | null>(null);
const isDeletingUser = ref(false);
const createUserForm = ref({
  username: '',
  email: '',
  password: '',
  role: 'PLAYER' as UserRole,
  language_code: 'pt-BR' as LanguageCode,
  active: true,
});

const canManageUsers = computed(() => user.value?.role === 'ADMIN');
const loginButtonText = computed(() => t(isSubmitting.value ? 'logging_in' : 'login'));
const isEditingUser = computed(() => editingUser.value !== null);

function localeFromLanguage(languageCode: LanguageCode): 'pt' | 'en' | 'es' {
  return languageCode === 'pt-BR' ? 'pt' : languageCode;
}

function setUserLanguage(authenticatedUser: AuthenticatedUser) {
  locale.value = localeFromLanguage(authenticatedUser.language_code);
}

function authorizationHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(tokenStorageKey);

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Accept-Language': locale.value,
  };
}

function userMessage(data: unknown, fallback: string) {
  return data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
    ? data.message
    : fallback;
}

function languageLabel(languageCode: LanguageCode) {
  return t(`language_${localeFromLanguage(languageCode)}`);
}

function roleLabel(role: UserRole) {
  return t(role === 'ADMIN' ? 'admin' : 'player');
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat(locale.value === 'pt' ? 'pt-BR' : locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function login() {
  errorMessage.value = '';

  if (!email.value.trim() || !password.value) {
    errorMessage.value = t('login_credentials_required');
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': locale.value },
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    });
    const data = (await response.json().catch(() => null)) as LoginResponse | { message?: string } | null;

    if (!response.ok || !data || !('access_token' in data) || !('user' in data)) {
      errorMessage.value = userMessage(data, t('login_failed'));
      return;
    }

    sessionStorage.setItem(tokenStorageKey, data.access_token);
    user.value = data.user;
    setUserLanguage(data.user);
  } catch {
    errorMessage.value = t('api_connection_failed');
  } finally {
    isSubmitting.value = false;
  }
}

async function restoreSession() {
  if (!sessionStorage.getItem(tokenStorageKey)) {
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: authorizationHeaders(),
    });
    const data = (await response.json().catch(() => null)) as { user?: AuthenticatedUser } | null;

    if (!response.ok || !data?.user) {
      sessionStorage.removeItem(tokenStorageKey);
      return;
    }

    user.value = data.user;
    setUserLanguage(data.user);
  } catch {
    sessionStorage.removeItem(tokenStorageKey);
  }
}

async function openUsers() {
  if (!canManageUsers.value) {
    return;
  }

  currentPage.value = 'users';
  await loadUsers();
}

async function loadUsers() {
  isLoadingUsers.value = true;
  usersError.value = '';

  try {
    const response = await fetch(`${apiUrl}/api/v1/users`, {
      headers: authorizationHeaders(),
    });
    const data = (await response.json().catch(() => null)) as { users?: ManagedUser[]; message?: string } | null;

    if (!response.ok || !data?.users) {
      usersError.value = userMessage(data, t('load_users_failed'));
      return;
    }

    users.value = data.users;
  } catch {
    usersError.value = t('load_users_connection_failed');
  } finally {
    isLoadingUsers.value = false;
  }
}

function openCreateUserDialog() {
  createUserError.value = '';
  editingUser.value = null;
  createUserForm.value = {
    username: '',
    email: '',
    password: '',
    role: 'PLAYER',
    language_code: 'pt-BR',
    active: true,
  };
  isCreateDialogOpen.value = true;
}

function openEditUserDialog(managedUser: ManagedUser) {
  createUserError.value = '';
  editingUser.value = managedUser;
  createUserForm.value = {
    username: managedUser.username,
    email: managedUser.email,
    password: '',
    role: managedUser.role,
    language_code: managedUser.language_code,
    active: managedUser.active,
  };
  isCreateDialogOpen.value = true;
}

async function saveUser() {
  createUserError.value = '';
  isCreatingUser.value = true;

  try {
    const targetUser = editingUser.value;
    const payload = {
      ...createUserForm.value,
      ...(targetUser && !createUserForm.value.password ? { password: undefined } : {}),
    };
    const response = await fetch(
      targetUser ? `${apiUrl}/api/v1/users/${targetUser.id}` : `${apiUrl}/api/v1/users`,
      {
        method: targetUser ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authorizationHeaders(),
      },
        body: JSON.stringify(payload),
      }
    );
    const data = (await response.json().catch(() => null)) as { user?: ManagedUser; message?: string } | null;

    if (!response.ok || !data?.user) {
      createUserError.value = userMessage(data, t('save_user_failed'));
      return;
    }

    users.value = targetUser
      ? users.value.map((managedUser) => (managedUser.id === data.user?.id ? data.user : managedUser))
      : [data.user, ...users.value];
    isCreateDialogOpen.value = false;
  } catch {
    createUserError.value = t('save_user_connection_failed');
  } finally {
    isCreatingUser.value = false;
  }
}

function requestUserDeletion(managedUser: ManagedUser) {
  userPendingDeletion.value = managedUser;
}

async function deleteManagedUser() {
  const managedUser = userPendingDeletion.value;

  if (!managedUser) {
    return;
  }

  usersError.value = '';
  isDeletingUser.value = true;

  try {
    const response = await fetch(`${apiUrl}/api/v1/users/${managedUser.id}`, {
      method: 'DELETE',
      headers: authorizationHeaders(),
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      usersError.value = userMessage(data, t('delete_user_failed'));
      return;
    }

    users.value = users.value.filter((item) => item.id !== managedUser.id);
    userPendingDeletion.value = null;
  } catch {
    usersError.value = t('delete_user_connection_failed');
  } finally {
    isDeletingUser.value = false;
  }
}

function logout() {
  sessionStorage.removeItem(tokenStorageKey);
  user.value = null;
  currentPage.value = 'dashboard';
  users.value = [];
  password.value = '';
}

onMounted(restoreSession);
</script>

<template>
  <v-app>
  <main v-if="!user" class="auth-page">
    <a class="auth-logo" href="/" :aria-label="$t('app_name')">
      <span class="auth-logo-mark" aria-hidden="true">S</span>
      <span class="auth-title">{{ $t('app_name') }}</span>
    </a>

    <section class="auth-wrapper">
      <aside class="auth-visual" aria-hidden="true">
        <div class="auth-illustration"><span></span><span></span><span></span></div>
      </aside>

      <section class="auth-card-v2" aria-labelledby="login-title">
        <form class="auth-card" @submit.prevent="login">
          <header>
            <h1 id="login-title">{{ $t('login_title', { app: $t('app_name') }) }}</h1>
            <p>{{ $t('login_subtitle') }}</p>
          </header>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>

          <label>
            <span>{{ $t('email') }}</span>
            <input v-model="email" autocomplete="email" autofocus inputmode="email" :placeholder="$t('email_placeholder')" type="email" />
          </label>

          <label>
            <span>{{ $t('password') }}</span>
            <span class="password-field">
              <input v-model="password" autocomplete="current-password" placeholder="············" :type="isPasswordVisible ? 'text' : 'password'" />
              <v-btn type="button" class="password-toggle" variant="text" size="small" @click="isPasswordVisible = !isPasswordVisible">
                {{ $t(isPasswordVisible ? 'hide' : 'show') }}
              </v-btn>
            </span>
          </label>

          <v-btn class="login-button" color="primary" type="submit" variant="flat" :loading="isSubmitting" block>{{ loginButtonText }}</v-btn>
        </form>
      </section>
    </section>
  </main>

  <main v-else class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="/" :aria-label="$t('app_name')">
        <span class="auth-logo-mark" aria-hidden="true">S</span>
        <span>{{ $t('app_name') }}</span>
      </a>

      <nav class="navigation" :aria-label="$t('app_name')">
        <v-btn :class="{ active: currentPage === 'dashboard' }" variant="text" @click="currentPage = 'dashboard'">
          <span aria-hidden="true">⌂</span> {{ $t('home') }}
        </v-btn>
        <v-btn v-if="canManageUsers" :class="{ active: currentPage === 'users' }" variant="text" @click="openUsers">
          <span aria-hidden="true">♙</span> {{ $t('users') }}
        </v-btn>
      </nav>

      <div class="sidebar-footer">
        <strong>{{ user.username }}</strong>
        <span>{{ roleLabel(user.role) }}</span>
      </div>
    </aside>

    <section class="app-content">
      <header class="topbar">
        <v-btn class="mobile-brand" type="button" variant="text" @click="currentPage = 'dashboard'">{{ $t('app_name') }}</v-btn>
        <div class="topbar-user">
          <div><strong>{{ user.username }}</strong><span>{{ user.email }}</span></div>
          <v-btn class="logout-button" type="button" variant="outlined" size="small" @click="logout">{{ $t('logout') }}</v-btn>
        </div>
      </header>

      <section v-if="currentPage === 'dashboard'" class="page-content dashboard-page">
        <p class="eyebrow">{{ $t('dashboard_eyebrow') }}</p>
        <h1>{{ $t('dashboard_greeting', { name: user.username }) }}</h1>
        <p class="page-subtitle">{{ $t('dashboard_subtitle') }}</p>

        <article v-if="canManageUsers" class="quick-action-card">
          <div>
            <p class="eyebrow">{{ $t('administration') }}</p>
            <h2>{{ $t('manage_users_title') }}</h2>
            <p>{{ $t('manage_users_description') }}</p>
          </div>
          <v-btn color="primary" type="button" variant="flat" @click="openUsers">{{ $t('open_users') }}</v-btn>
        </article>
      </section>

      <section v-else class="page-content users-page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">{{ $t('administration') }}</p>
            <h1>{{ $t('users') }}</h1>
            <p class="page-subtitle">{{ $t('users_subtitle') }}</p>
          </div>
          <v-btn color="primary" type="button" variant="flat" @click="openCreateUserDialog">{{ $t('new_user') }}</v-btn>
        </div>

        <article class="data-card">
          <div class="data-card-header">
            <div><h2>{{ $t('all_users') }}</h2><p>{{ $t('users_found', { count: users.length }) }}</p></div>
            <v-btn class="refresh-button" type="button" variant="outlined" size="small" :loading="isLoadingUsers" @click="loadUsers">{{ $t('refresh') }}</v-btn>
          </div>

          <p v-if="usersError" class="form-error" role="alert">{{ usersError }}</p>
          <p v-else-if="isLoadingUsers" class="empty-state">{{ $t('loading_users') }}</p>
          <p v-else-if="!users.length" class="empty-state">{{ $t('no_users') }}</p>

          <div v-else class="table-wrap">
            <table>
              <thead><tr><th>{{ $t('user') }}</th><th>{{ $t('role') }}</th><th>{{ $t('language') }}</th><th>{{ $t('status') }}</th><th>{{ $t('registered_at') }}</th><th>{{ $t('actions') }}</th></tr></thead>
              <tbody>
                <tr v-for="managedUser in users" :key="managedUser.id">
                  <td><strong>{{ managedUser.username }}</strong><span>{{ managedUser.email }}</span></td>
                  <td><span class="tag role-tag">{{ roleLabel(managedUser.role) }}</span></td>
                  <td>{{ languageLabel(managedUser.language_code) }}</td>
                  <td><span :class="['tag', managedUser.active ? 'active-tag' : 'inactive-tag']">{{ $t(managedUser.active ? 'active' : 'inactive') }}</span></td>
                  <td>{{ formattedDate(managedUser.created_at) }}</td>
                  <td class="row-actions"><v-btn type="button" variant="text" size="small" @click="openEditUserDialog(managedUser)">{{ $t('edit') }}</v-btn><v-btn class="danger-action" color="error" type="button" variant="text" size="small" @click="requestUserDeletion(managedUser)">{{ $t('delete') }}</v-btn></td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </section>

    <v-dialog v-model="isCreateDialogOpen" max-width="540">
      <v-card class="modal-card">
        <v-card-text>
          <form @submit.prevent="saveUser">
            <header><p class="eyebrow">{{ $t(isEditingUser ? 'edit_registration' : 'new_registration') }}</p><h2>{{ $t(isEditingUser ? 'edit_user' : 'register_user') }}</h2><p>{{ $t('user_form_subtitle') }}</p></header>
            <p v-if="createUserError" class="form-error" role="alert">{{ createUserError }}</p>
            <label><span>{{ $t('username') }}</span><input v-model="createUserForm.username" autocomplete="username" maxlength="120" required /></label>
            <label><span>{{ $t('email') }}</span><input v-model="createUserForm.email" autocomplete="email" maxlength="320" required type="email" /></label>
            <label><span>{{ $t(isEditingUser ? 'new_password_optional' : 'password') }}</span><input v-model="createUserForm.password" autocomplete="new-password" minlength="8" :required="!isEditingUser" type="password" /></label>
            <div class="form-grid">
              <label><span>{{ $t('role') }}</span><select v-model="createUserForm.role"><option value="PLAYER">{{ $t('player') }}</option><option value="ADMIN">{{ $t('admin') }}</option></select></label>
              <label><span>{{ $t('game_language') }}</span><select v-model="createUserForm.language_code"><option value="pt-BR">{{ $t('language_pt') }}</option><option value="en">{{ $t('language_en') }}</option><option value="es">{{ $t('language_es') }}</option></select></label>
            </div>
            <label v-if="isEditingUser"><span>{{ $t('status') }}</span><select v-model="createUserForm.active"><option :value="true">{{ $t('active') }}</option><option :value="false">{{ $t('inactive') }}</option></select></label>
            <footer><v-btn type="button" variant="outlined" @click="isCreateDialogOpen = false">{{ $t('cancel') }}</v-btn><v-btn color="primary" type="submit" variant="flat" :loading="isCreatingUser">{{ $t(isEditingUser ? 'save_changes' : 'register') }}</v-btn></footer>
          </form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="userPendingDeletion !== null"
      max-width="460"
      persistent
      @update:model-value="(visible) => { if (!visible && !isDeletingUser) userPendingDeletion = null }"
    >
      <v-card class="delete-dialog-card">
        <v-card-title>{{ $t('delete_user_question') }}</v-card-title>
        <v-card-text>
          {{ $t('delete_user_confirmation', { name: userPendingDeletion?.username }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="isDeletingUser" @click="userPendingDeletion = null">{{ $t('cancel') }}</v-btn>
          <v-btn color="error" variant="flat" :loading="isDeletingUser" @click="deleteManagedUser">{{ $t('delete_user') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>

  </v-app>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap');

:root { color: #2f2b3d; background: #f8f7fa; font-family: 'Public Sans', sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
button, input, select { font: inherit; }
button { cursor: pointer; }

.auth-page { min-height: 100dvh; background: #fff; }
.auth-logo, .brand { align-items: center; color: #2f2b3d; display: flex; font-weight: 700; gap: 12px; text-decoration: none; }
.auth-logo { left: 2.3rem; position: absolute; top: 2rem; z-index: 2; }
.auth-logo-mark { align-items: center; background: #7367f0; border-radius: 8px; color: #fff; display: inline-flex; font-size: 18px; font-weight: 700; height: 34px; justify-content: center; width: 34px; }
.auth-title { font-size: 1.375rem; }
.auth-wrapper { display: grid; grid-template-columns: minmax(0, 2fr) minmax(380px, 1fr); min-height: 100dvh; }
.auth-visual { align-items: center; background: radial-gradient(circle at 50% 80%, rgba(115,103,240,.18), transparent 38%), #f8f7fa; display: flex; justify-content: center; padding: 6.25rem; }
.auth-illustration { align-items: end; background: #fff; border: 1px solid #e7e5ef; border-radius: 10px; box-shadow: 0 9px 28px rgba(47,43,61,.10); display: flex; gap: 16px; height: min(32vw, 340px); justify-content: center; max-width: 613px; padding: 40px; position: relative; width: 100%; }
.auth-illustration::before { border: 12px solid #7367f0; border-bottom: 0; border-radius: 12px 12px 0 0; content: ''; height: 54%; left: 22%; position: absolute; right: 22%; top: 19%; }
.auth-illustration span { background: #7367f0; border-radius: 5px 5px 0 0; height: 31%; width: 15%; z-index: 1; }
.auth-illustration span:nth-child(2) { background: #a8a3f7; height: 50%; }.auth-illustration span:nth-child(3) { height: 40%; }
.auth-card-v2 { align-items: center; display: flex; justify-content: center; padding: 1.5rem; }.auth-card { max-width: 500px; padding: 1.5rem; width: 100%; }
h1, h2, p { margin-top: 0; }.auth-card h1 { font-size: 1.5rem; margin-bottom: .25rem; }.auth-card header p, .page-subtitle, .modal-card header > p:last-child { color: #5d596c; line-height: 1.5; }
label { display: block; margin-top: 1.15rem; } label > span { display: block; font-size: .875rem; margin-bottom: .5rem; }
input, select { background: #fff; border: 1px solid #dbdae1; border-radius: 6px; color: #2f2b3d; height: 40px; outline: 0; padding: 0 12px; width: 100%; }
input:focus, select:focus { border-color: #7367f0; box-shadow: 0 0 0 3px rgba(115,103,240,.15); }.password-field { display: block; position: relative; }.password-field input { padding-right: 72px; }
.password-toggle { background: transparent; border: 0; color: #7367f0; font-size: .75rem; font-weight: 600; padding: 8px; position: absolute; right: 4px; top: 4px; }
.primary-button, .secondary-button, .refresh-button, .logout-button { border-radius: 6px; font-size: .875rem; font-weight: 600; min-height: 38px; padding: 0 16px; }.primary-button { background: #7367f0; border: 1px solid #7367f0; box-shadow: 0 2px 6px rgba(115,103,240,.25); color: #fff; }.primary-button:hover:not(:disabled) { background: #675dd8; }.primary-button:disabled { cursor: wait; opacity: .7; }.login-button { margin-top: 1.5rem; width: 100%; }
.form-error { background: #ffe7e7; border-radius: 6px; color: #b42318; font-size: .875rem; margin: 1.15rem 0 0; padding: .75rem; }

.app-shell { background: #f8f7fa; display: flex; min-height: 100dvh; }.sidebar { background: #fff; border-right: 1px solid #e7e5ef; display: flex; flex-direction: column; flex-shrink: 0; padding: 1.5rem 1rem; width: 260px; }.brand { padding: 0 .75rem; }.navigation { display: grid; gap: .35rem; margin-top: 3rem; }.navigation button { background: transparent; border: 0; border-radius: 6px; color: #5d596c; display: flex; font-size: .95rem; gap: .75rem; padding: .72rem .85rem; text-align: left; }.navigation button:hover { background: #f4f3fe; }.navigation button.active { background: rgba(115,103,240,.16); color: #665bd5; font-weight: 600; }.sidebar-footer { border-top: 1px solid #e7e5ef; display: grid; gap: .25rem; margin-top: auto; padding: 1rem .75rem .25rem; }.sidebar-footer span { color: #797586; font-size: .8rem; }
.app-content { min-width: 0; width: 100%; }.topbar { align-items: center; background: #fff; border-bottom: 1px solid #e7e5ef; display: flex; height: 72px; justify-content: flex-end; padding: 0 2rem; }.topbar-user { align-items: center; display: flex; gap: 1rem; }.topbar-user div { display: grid; text-align: right; }.topbar-user span { color: #797586; font-size: .78rem; }.logout-button, .refresh-button { background: #fff; border: 1px solid #dbdae1; color: #5d596c; }.logout-button:hover, .refresh-button:hover:not(:disabled) { border-color: #7367f0; color: #665bd5; }.mobile-brand { display: none; }
.page-content { margin: 0 auto; max-width: 1320px; padding: 2.25rem; }.eyebrow { color: #7367f0; font-size: .73rem; font-weight: 700; letter-spacing: .08em; margin-bottom: .5rem; text-transform: uppercase; }.page-content h1 { font-size: 1.6rem; margin-bottom: .4rem; }.page-subtitle { margin-bottom: 2rem; }.quick-action-card, .data-card { background: #fff; border: 1px solid #e7e5ef; border-radius: 8px; box-shadow: 0 2px 8px rgba(47,43,61,.04); }.quick-action-card { align-items: center; display: flex; justify-content: space-between; max-width: 700px; padding: 1.5rem; }.quick-action-card h2 { font-size: 1.05rem; margin-bottom: .4rem; }.quick-action-card p:last-child { color: #5d596c; margin-bottom: 0; }
.page-heading, .data-card-header { align-items: center; display: flex; gap: 1.5rem; justify-content: space-between; }.page-heading { margin-bottom: 1.75rem; }.data-card { overflow: hidden; }.data-card-header { border-bottom: 1px solid #e7e5ef; padding: 1.25rem 1.5rem; }.data-card-header h2 { font-size: 1rem; margin-bottom: .2rem; }.data-card-header p { color: #797586; font-size: .82rem; margin-bottom: 0; }.empty-state { color: #797586; padding: 2rem 1.5rem; text-align: center; }.table-wrap { overflow-x: auto; }table { border-collapse: collapse; min-width: 760px; width: 100%; }th, td { border-bottom: 1px solid #eeedf2; padding: 1rem 1.5rem; text-align: left; }th { color: #797586; font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }td { color: #5d596c; font-size: .875rem; }td:first-child strong, td:first-child span { display: block; }td:first-child strong { color: #2f2b3d; margin-bottom: .25rem; }td:first-child span { color: #797586; font-size: .78rem; }.tag { border-radius: 4px; display: inline-block; font-size: .73rem; font-weight: 600; padding: .28rem .5rem; }.role-tag { background: rgba(115,103,240,.14); color: #665bd5; }.active-tag { background: rgba(40,199,111,.15); color: #1f9d55; }.inactive-tag { background: rgba(234,84,85,.14); color: #c73d3e; }
.row-actions { white-space: nowrap; }.row-actions button { background: transparent; border: 0; color: #665bd5; font-size: .8rem; font-weight: 600; padding: .25rem .35rem; }.row-actions .danger-action { color: #c73d3e; }.modal-backdrop { align-items: center; background: rgba(47,43,61,.45); display: flex; inset: 0; justify-content: center; padding: 1.5rem; position: fixed; z-index: 10; }.modal-card { background: #fff; border-radius: 8px; box-shadow: 0 12px 36px rgba(47,43,61,.25); max-width: 540px; padding: 1.5rem; width: 100%; }.modal-card h2 { font-size: 1.25rem; margin-bottom: .35rem; }.form-grid { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }.modal-card footer { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.5rem; }.secondary-button { background: #fff; border: 1px solid #dbdae1; color: #5d596c; }
@media (max-width: 959px) { .auth-wrapper { display: block; }.auth-visual { display: none; }.auth-card-v2 { min-height: 100dvh; }.sidebar { display: none; }.topbar { justify-content: space-between; padding: 0 1rem; }.mobile-brand { background: transparent; border: 0; color: #2f2b3d; display: block; font-weight: 700; }.page-content { padding: 1.5rem; } }
@media (max-width: 599px) { .auth-logo { left: 1.5rem; top: 1.5rem; }.auth-card-v2 { padding: 1rem; padding-top: 5rem; }.page-heading, .quick-action-card { align-items: stretch; flex-direction: column; }.page-heading .primary-button, .quick-action-card .primary-button { width: 100%; }.topbar-user div { display: none; }.form-grid { grid-template-columns: 1fr; }.modal-card footer { flex-direction: column-reverse; }.modal-card footer button { width: 100%; } }
</style>
