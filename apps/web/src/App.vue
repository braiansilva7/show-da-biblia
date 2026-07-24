<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

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
const loginButtonText = computed(() => (isSubmitting.value ? 'Entrando...' : 'Entrar'));
const isEditingUser = computed(() => editingUser.value !== null);

function authorizationHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(tokenStorageKey);

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function userMessage(data: unknown, fallback: string) {
  return data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
    ? data.message
    : fallback;
}

function languageLabel(languageCode: LanguageCode) {
  return ({ 'pt-BR': 'Português', en: 'Inglês', es: 'Espanhol' })[languageCode];
}

function roleLabel(role: UserRole) {
  return role === 'ADMIN' ? 'Administrador' : 'Jogador';
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function login() {
  errorMessage.value = '';

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Informe seu e-mail e senha.';
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    });
    const data = (await response.json().catch(() => null)) as LoginResponse | { message?: string } | null;

    if (!response.ok || !data || !('access_token' in data) || !('user' in data)) {
      errorMessage.value = userMessage(data, 'Não foi possível entrar. Tente novamente.');
      return;
    }

    sessionStorage.setItem(tokenStorageKey, data.access_token);
    user.value = data.user;
  } catch {
    errorMessage.value = 'Não foi possível conectar à API. Verifique se ela está em execução.';
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
      usersError.value = userMessage(data, 'Não foi possível carregar os usuários.');
      return;
    }

    users.value = data.users;
  } catch {
    usersError.value = 'Não foi possível conectar à API para carregar os usuários.';
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
      createUserError.value = userMessage(data, 'Não foi possível cadastrar o usuário.');
      return;
    }

    users.value = targetUser
      ? users.value.map((managedUser) => (managedUser.id === data.user?.id ? data.user : managedUser))
      : [data.user, ...users.value];
    isCreateDialogOpen.value = false;
  } catch {
    createUserError.value = 'Não foi possível conectar à API para cadastrar o usuário.';
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
      usersError.value = userMessage(data, 'Não foi possível excluir o usuário.');
      return;
    }

    users.value = users.value.filter((item) => item.id !== managedUser.id);
    userPendingDeletion.value = null;
  } catch {
    usersError.value = 'Não foi possível conectar à API para excluir o usuário.';
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
    <a class="auth-logo" href="/" aria-label="Show da Bíblia">
      <span class="auth-logo-mark" aria-hidden="true">S</span>
      <span class="auth-title">Show da Bíblia</span>
    </a>

    <section class="auth-wrapper">
      <aside class="auth-visual" aria-hidden="true">
        <div class="auth-illustration"><span></span><span></span><span></span></div>
      </aside>

      <section class="auth-card-v2" aria-labelledby="login-title">
        <form class="auth-card" @submit.prevent="login">
          <header>
            <h1 id="login-title">Bem-vindo ao <span>Show da Bíblia</span>!</h1>
            <p>Entre com seus dados para acessar o painel administrativo.</p>
          </header>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>

          <label>
            <span>E-mail</span>
            <input v-model="email" autocomplete="email" autofocus inputmode="email" placeholder="email@email.com" type="email" />
          </label>

          <label>
            <span>Senha</span>
            <span class="password-field">
              <input v-model="password" autocomplete="current-password" placeholder="············" :type="isPasswordVisible ? 'text' : 'password'" />
              <v-btn type="button" class="password-toggle" variant="text" size="small" @click="isPasswordVisible = !isPasswordVisible">
                {{ isPasswordVisible ? 'Ocultar' : 'Exibir' }}
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
      <a class="brand" href="/" aria-label="Show da Bíblia">
        <span class="auth-logo-mark" aria-hidden="true">S</span>
        <span>Show da Bíblia</span>
      </a>

      <nav class="navigation" aria-label="Menu principal">
        <v-btn :class="{ active: currentPage === 'dashboard' }" variant="text" @click="currentPage = 'dashboard'">
          <span aria-hidden="true">⌂</span> Início
        </v-btn>
        <v-btn v-if="canManageUsers" :class="{ active: currentPage === 'users' }" variant="text" @click="openUsers">
          <span aria-hidden="true">♙</span> Usuários
        </v-btn>
      </nav>

      <div class="sidebar-footer">
        <strong>{{ user.username }}</strong>
        <span>{{ roleLabel(user.role) }}</span>
      </div>
    </aside>

    <section class="app-content">
      <header class="topbar">
        <v-btn class="mobile-brand" type="button" variant="text" @click="currentPage = 'dashboard'">Show da Bíblia</v-btn>
        <div class="topbar-user">
          <div><strong>{{ user.username }}</strong><span>{{ user.email }}</span></div>
          <v-btn class="logout-button" type="button" variant="outlined" size="small" @click="logout">Sair</v-btn>
        </div>
      </header>

      <section v-if="currentPage === 'dashboard'" class="page-content dashboard-page">
        <p class="eyebrow">Painel administrativo</p>
        <h1>Olá, {{ user.username }}!</h1>
        <p class="page-subtitle">Gerencie o conteúdo e acompanhe a evolução do Show da Bíblia.</p>

        <article v-if="canManageUsers" class="quick-action-card">
          <div>
            <p class="eyebrow">Administração</p>
            <h2>Gerencie os usuários do sistema</h2>
            <p>Consulte os cadastros e adicione novos administradores ou jogadores.</p>
          </div>
          <v-btn color="primary" type="button" variant="flat" @click="openUsers">Abrir usuários</v-btn>
        </article>
      </section>

      <section v-else class="page-content users-page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">Administração</p>
            <h1>Usuários</h1>
            <p class="page-subtitle">Consulte e cadastre as pessoas que acessam o sistema.</p>
          </div>
          <v-btn color="primary" type="button" variant="flat" @click="openCreateUserDialog">Novo usuário</v-btn>
        </div>

        <article class="data-card">
          <div class="data-card-header">
            <div><h2>Todos os usuários</h2><p>{{ users.length }} cadastro(s) encontrado(s)</p></div>
            <v-btn class="refresh-button" type="button" variant="outlined" size="small" :loading="isLoadingUsers" @click="loadUsers">Atualizar</v-btn>
          </div>

          <p v-if="usersError" class="form-error" role="alert">{{ usersError }}</p>
          <p v-else-if="isLoadingUsers" class="empty-state">Carregando usuários...</p>
          <p v-else-if="!users.length" class="empty-state">Nenhum usuário cadastrado.</p>

          <div v-else class="table-wrap">
            <table>
              <thead><tr><th>Usuário</th><th>Perfil</th><th>Idioma</th><th>Status</th><th>Cadastrado em</th><th>Ações</th></tr></thead>
              <tbody>
                <tr v-for="managedUser in users" :key="managedUser.id">
                  <td><strong>{{ managedUser.username }}</strong><span>{{ managedUser.email }}</span></td>
                  <td><span class="tag role-tag">{{ roleLabel(managedUser.role) }}</span></td>
                  <td>{{ languageLabel(managedUser.language_code) }}</td>
                  <td><span :class="['tag', managedUser.active ? 'active-tag' : 'inactive-tag']">{{ managedUser.active ? 'Ativo' : 'Inativo' }}</span></td>
                  <td>{{ formattedDate(managedUser.created_at) }}</td>
                  <td class="row-actions"><v-btn type="button" variant="text" size="small" @click="openEditUserDialog(managedUser)">Editar</v-btn><v-btn class="danger-action" color="error" type="button" variant="text" size="small" @click="requestUserDeletion(managedUser)">Excluir</v-btn></td>
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
            <header><p class="eyebrow">{{ isEditingUser ? 'Edição de cadastro' : 'Novo cadastro' }}</p><h2>{{ isEditingUser ? 'Editar usuário' : 'Cadastrar usuário' }}</h2><p>Defina os dados de acesso e a preferência de idioma.</p></header>
            <p v-if="createUserError" class="form-error" role="alert">{{ createUserError }}</p>
            <label><span>Nome de usuário</span><input v-model="createUserForm.username" autocomplete="username" maxlength="120" required /></label>
            <label><span>E-mail</span><input v-model="createUserForm.email" autocomplete="email" maxlength="320" required type="email" /></label>
            <label><span>{{ isEditingUser ? 'Nova senha (opcional)' : 'Senha' }}</span><input v-model="createUserForm.password" autocomplete="new-password" minlength="8" :required="!isEditingUser" type="password" /></label>
            <div class="form-grid">
              <label><span>Perfil</span><select v-model="createUserForm.role"><option value="PLAYER">Jogador</option><option value="ADMIN">Administrador</option></select></label>
              <label><span>Idioma do jogo</span><select v-model="createUserForm.language_code"><option value="pt-BR">Português</option><option value="en">Inglês</option><option value="es">Espanhol</option></select></label>
            </div>
            <label v-if="isEditingUser"><span>Status</span><select v-model="createUserForm.active"><option :value="true">Ativo</option><option :value="false">Inativo</option></select></label>
            <footer><v-btn type="button" variant="outlined" @click="isCreateDialogOpen = false">Cancelar</v-btn><v-btn color="primary" type="submit" variant="flat" :loading="isCreatingUser">{{ isEditingUser ? 'Salvar alterações' : 'Cadastrar' }}</v-btn></footer>
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
        <v-card-title>Excluir usuário?</v-card-title>
        <v-card-text>
          Você deseja apagar o usuário <strong>{{ userPendingDeletion?.username }}</strong>?
          Esta ação não pode ser desfeita.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="isDeletingUser" @click="userPendingDeletion = null">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="isDeletingUser" @click="deleteManagedUser">Excluir usuário</v-btn>
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
