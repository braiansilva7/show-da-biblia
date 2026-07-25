import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ApiMessage, LoginResponse } from '@/types/api';
import type {
  AuthenticatedUser,
  Country,
  ManagedUser,
  PermissionRole,
  UserFormInput,
  UsersListResponse,
} from '@/types/user';
import { localeFromLanguage } from '@/utils/locale';
import type { DashboardSummary } from '@/types/dashboard';

const apiUrl = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');
const tokenStorageKey = 'show-da-biblia.access-token';

function getMessage(data: unknown, fallback: string): string {
  return data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
    ? data.message
    : fallback;
}

export function useManagerApi() {
  const { locale, t } = useI18n();
  const user = ref<AuthenticatedUser | null>(null);
  const users = ref<ManagedUser[]>([]);
  const usersTotal = ref(0);
  const usersPage = ref(1);
  const usersLimit = ref(20);
  const usersSearch = ref('');
  const roles = ref<PermissionRole[]>([]);
  const countries = ref<Country[]>([]);
  const dashboardSummary = ref<DashboardSummary | null>(null);
  const dashboardError = ref('');
  const isLoadingDashboard = ref(false);
  const loginError = ref('');
  const usersError = ref('');
  const saveUserError = ref('');
  const isLoggingIn = ref(false);
  const isLoadingUsers = ref(false);
  const isSavingUser = ref(false);
  const isDeletingUser = ref(false);
  let usersRequestId = 0;

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

  async function login(email: string, password: string) {
    loginError.value = '';
    if (!email.trim() || !password) {
      loginError.value = t('login_credentials_required');
      return;
    }
    isLoggingIn.value = true;
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale.value,
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await response.json().catch(() => null)) as
        LoginResponse | ApiMessage | null;
      if (
        !response.ok ||
        !data ||
        !('access_token' in data) ||
        !('user' in data)
      ) {
        loginError.value = getMessage(data, t('login_failed'));
        return;
      }
      sessionStorage.setItem(tokenStorageKey, data.access_token);
      user.value = data.user;
      setUserLanguage(data.user);
    } catch {
      loginError.value = t('api_connection_failed');
    } finally {
      isLoggingIn.value = false;
    }
  }

  async function restoreSession() {
    if (!sessionStorage.getItem(tokenStorageKey)) return;
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: AuthenticatedUser;
      } | null;
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

  async function loadUsers(
    options: { page?: number; search?: string; limit?: number } = {}
  ) {
    const requestId = ++usersRequestId;
    const page = options.page ?? usersPage.value;
    const search = options.search ?? usersSearch.value;
    const limit = options.limit ?? usersLimit.value;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set('search', search.trim());
    isLoadingUsers.value = true;
    usersError.value = '';
    try {
      const response = await fetch(`${apiUrl}/api/v1/users?${params}`, {
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        (Partial<UsersListResponse> & ApiMessage) | null;
      if (
        !response.ok ||
        !data?.users ||
        typeof data.total !== 'number' ||
        typeof data.page !== 'number' ||
        typeof data.limit !== 'number'
      ) {
        if (requestId === usersRequestId)
          usersError.value = getMessage(data, t('load_users_failed'));
        return;
      }
      const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
      if (data.total > 0 && data.page > lastPage) {
        await loadUsers({ page: lastPage, search, limit: data.limit });
        return;
      }
      if (requestId !== usersRequestId) return;
      users.value = data.users;
      usersTotal.value = data.total;
      usersPage.value = data.page;
      usersLimit.value = data.limit;
      usersSearch.value = search;
    } catch {
      if (requestId === usersRequestId)
        usersError.value = t('load_users_connection_failed');
    } finally {
      if (requestId === usersRequestId) isLoadingUsers.value = false;
    }
  }
  async function loadDashboard() {
    isLoadingDashboard.value = true;
    dashboardError.value = '';
    try {
      const response = await fetch(`${apiUrl}/api/v1/dashboard/summary`, {
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        ({ summary?: DashboardSummary } & ApiMessage) | null;
      if (!response.ok || !data?.summary) {
        dashboardError.value = getMessage(data, t('load_dashboard_failed'));
        return;
      }
      dashboardSummary.value = data.summary;
    } catch {
      dashboardError.value = t('load_dashboard_connection_failed');
    } finally {
      isLoadingDashboard.value = false;
    }
  }
  async function loadRoles() {
    const response = await fetch(`${apiUrl}/api/v1/permission-roles`, {
      headers: authorizationHeaders(),
    });
    const data = (await response.json().catch(() => null)) as {
      roles?: PermissionRole[];
    } | null;
    if (response.ok && data?.roles) roles.value = data.roles;
  }

  async function loadCountries() {
    const response = await fetch(`${apiUrl}/api/v1/countries`, {
      headers: authorizationHeaders(),
    });
    const data = (await response.json().catch(() => null)) as {
      countries?: Country[];
    } | null;
    if (response.ok && data?.countries) countries.value = data.countries;
  }

  async function saveUser(
    input: UserFormInput,
    targetUser: ManagedUser | null
  ) {
    saveUserError.value = '';
    isSavingUser.value = true;
    try {
      const payload = new FormData();
      payload.set('username', input.username);
      payload.set('email', input.email);
      payload.set('permission_role_id', input.permission_role_id);
      payload.set('country_id', input.country_id);
      payload.set('language_code', input.language_code);
      payload.set('active', String(input.active));
      if (input.password) payload.set('password', input.password);
      if (input.profile_picture)
        payload.set('profile_picture', input.profile_picture);
      const response = await fetch(
        targetUser
          ? `${apiUrl}/api/v1/users/${targetUser.id}`
          : `${apiUrl}/api/v1/users`,
        {
          method: targetUser ? 'PATCH' : 'POST',
          headers: {
            ...authorizationHeaders(),
          },
          body: payload,
        }
      );
      const data = (await response.json().catch(() => null)) as
        ({ user?: ManagedUser } & ApiMessage) | null;
      if (!response.ok || !data?.user) {
        saveUserError.value = getMessage(data, t('save_user_failed'));
        return false;
      }
      if (data.user.id === user.value?.id) {
        user.value = { ...user.value, ...data.user };
        setUserLanguage(user.value);
      }
      await loadUsers();
      return true;
    } catch {
      saveUserError.value = t('save_user_connection_failed');
      return false;
    } finally {
      isSavingUser.value = false;
    }
  }

  async function deleteUser(managedUser: ManagedUser): Promise<boolean> {
    usersError.value = '';
    isDeletingUser.value = true;
    try {
      const response = await fetch(`${apiUrl}/api/v1/users/${managedUser.id}`, {
        method: 'DELETE',
        headers: authorizationHeaders(),
      });
      const data = (await response
        .json()
        .catch(() => null)) as ApiMessage | null;
      if (!response.ok) {
        usersError.value = getMessage(data, t('delete_user_failed'));
        return false;
      }
      await loadUsers();
      return true;
    } catch {
      usersError.value = t('delete_user_connection_failed');
      return false;
    } finally {
      isDeletingUser.value = false;
    }
  }

  function logout() {
    sessionStorage.removeItem(tokenStorageKey);
    user.value = null;
    users.value = [];
    usersTotal.value = 0;
    usersPage.value = 1;
    usersSearch.value = '';
  }
  return {
    user,
    users,
    usersTotal,
    usersPage,
    usersLimit,
    usersSearch,
    roles,
    countries,
    dashboardSummary,
    dashboardError,
    isLoadingDashboard,
    loginError,
    usersError,
    saveUserError,
    isLoggingIn,
    isLoadingUsers,
    isSavingUser,
    isDeletingUser,
    login,
    restoreSession,
    loadUsers,
    loadDashboard,
    loadRoles,
    loadCountries,
    saveUser,
    deleteUser,
    logout,
  };
}
