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
import type {
  CategoriesListResponse,
  Category,
  CategoryFormInput,
} from '@/types/category';
import type {
  QuestionCategoryFilter,
  QuestionFilters,
  QuestionListItem,
  QuestionsListResponse,
  EditableQuestion,
  QuestionFormInput,
} from '@/types/question';

const apiUrl = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');
const tokenStorageKey = 'show-da-biblia.access-token';
const questionsStorageKey = 'show-da-biblia.questions-list';

const emptyQuestionFilters = (): QuestionFilters => ({
  search: '',
  category_id: '',
  difficulty_level: null,
  status: null,
  author: '',
  created_from: '',
  created_to: '',
});

function storedQuestionState(): {
  filters: QuestionFilters;
  page: number;
  limit: number;
} {
  try {
    const value = JSON.parse(sessionStorage.getItem(questionsStorageKey) ?? '');
    if (!value || typeof value !== 'object') throw new Error('invalid state');
    return {
      filters: { ...emptyQuestionFilters(), ...value.filters },
      page: typeof value.page === 'number' && value.page > 0 ? value.page : 1,
      limit:
        typeof value.limit === 'number' && value.limit > 0 && value.limit <= 100
          ? value.limit
          : 20,
    };
  } catch {
    return { filters: emptyQuestionFilters(), page: 1, limit: 20 };
  }
}

function getMessage(data: unknown, fallback: string): string {
  return data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
    ? data.message
    : fallback;
}

function normalizeEditableQuestion(question: EditableQuestion): EditableQuestion {
  const languages = ['pt-BR', 'en', 'es'] as const;
  return {
    ...question,
    translations: Object.fromEntries(languages.map((language) => [language, question.translations?.[language] ?? { statement: '', explanation: '' }])) as EditableQuestion['translations'],
    options: question.options.map((option) => ({
      ...option,
      translations: Object.fromEntries(languages.map((language) => [language, option.translations?.[language] ?? { content: '' }])) as typeof option.translations,
    })),
  };
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
  const categories = ref<Category[]>([]);
  const categoriesTotal = ref(0);
  const categoriesPage = ref(1);
  const categoriesLimit = ref(20);
  const categoriesSearch = ref('');
  const savedQuestionState = storedQuestionState();
  const questions = ref<QuestionListItem[]>([]);
  const questionsTotal = ref(0);
  const questionsPage = ref(savedQuestionState.page);
  const questionsLimit = ref(savedQuestionState.limit);
  const questionFilters = ref<QuestionFilters>(savedQuestionState.filters);
  const questionCategories = ref<QuestionCategoryFilter[]>([]);
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
  const categoriesError = ref('');
  const saveCategoryError = ref('');
  const isLoadingCategories = ref(false);
  const isSavingCategory = ref(false);
  const isDeletingCategory = ref(false);
  const questionsError = ref('');
  const isLoadingQuestions = ref(false);
  const editingQuestion = ref<EditableQuestion | null>(null);
  const questionFormError = ref('');
  const isSavingQuestion = ref(false);
  const isPublishingQuestion = ref(false);
  const isRemovingQuestion = ref(false);
  let usersRequestId = 0;
  let categoriesRequestId = 0;
  let questionsRequestId = 0;

  function persistQuestionState() {
    sessionStorage.setItem(
      questionsStorageKey,
      JSON.stringify({
        filters: questionFilters.value,
        page: questionsPage.value,
        limit: questionsLimit.value,
      })
    );
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
  async function loadCategories(
    options: { page?: number; search?: string; limit?: number } = {}
  ) {
    const requestId = ++categoriesRequestId;
    const page = options.page ?? categoriesPage.value;
    const search = options.search ?? categoriesSearch.value;
    const limit = options.limit ?? categoriesLimit.value;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set('search', search.trim());
    isLoadingCategories.value = true;
    categoriesError.value = '';
    try {
      const response = await fetch(`${apiUrl}/api/v1/categories?${params}`, {
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        (Partial<CategoriesListResponse> & ApiMessage) | null;
      if (
        !response.ok ||
        !data?.categories ||
        typeof data.total !== 'number' ||
        typeof data.page !== 'number' ||
        typeof data.limit !== 'number'
      ) {
        if (requestId === categoriesRequestId)
          categoriesError.value = getMessage(data, t('load_categories_failed'));
        return;
      }
      const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
      if (data.total > 0 && data.page > lastPage) {
        await loadCategories({ page: lastPage, search, limit: data.limit });
        return;
      }
      if (requestId !== categoriesRequestId) return;
      categories.value = data.categories;
      categoriesTotal.value = data.total;
      categoriesPage.value = data.page;
      categoriesLimit.value = data.limit;
      categoriesSearch.value = search;
    } catch {
      if (requestId === categoriesRequestId)
        categoriesError.value = t('load_categories_connection_failed');
    } finally {
      if (requestId === categoriesRequestId) isLoadingCategories.value = false;
    }
  }

  async function loadQuestions(
    options: {
      page?: number;
      limit?: number;
      filters?: Partial<QuestionFilters>;
    } = {}
  ) {
    const requestId = ++questionsRequestId;
    const filters = { ...questionFilters.value, ...options.filters };
    const page = options.page ?? questionsPage.value;
    const limit = options.limit ?? questionsLimit.value;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.difficulty_level)
      params.set('difficulty_level', String(filters.difficulty_level));
    if (filters.status) params.set('status', filters.status);
    if (filters.author.trim()) params.set('author', filters.author.trim());
    if (filters.created_from)
      params.set('created_from', `${filters.created_from}T00:00:00.000Z`);
    if (filters.created_to)
      params.set('created_to', `${filters.created_to}T23:59:59.999Z`);
    isLoadingQuestions.value = true;
    questionsError.value = '';
    try {
      const response = await fetch(`${apiUrl}/api/v1/questions?${params}`, {
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        (Partial<QuestionsListResponse> & ApiMessage) | null;
      if (
        !response.ok ||
        !data?.questions ||
        !data.categories ||
        typeof data.total !== 'number' ||
        typeof data.page !== 'number' ||
        typeof data.limit !== 'number'
      ) {
        if (requestId === questionsRequestId)
          questionsError.value = getMessage(data, t('load_questions_failed'));
        return;
      }
      const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
      if (data.total > 0 && data.page > lastPage) {
        await loadQuestions({ page: lastPage, limit: data.limit, filters });
        return;
      }
      if (requestId !== questionsRequestId) return;
      questions.value = data.questions;
      questionsTotal.value = data.total;
      questionsPage.value = data.page;
      questionsLimit.value = data.limit;
      questionFilters.value = filters;
      questionCategories.value = data.categories;
      persistQuestionState();
    } catch {
      if (requestId === questionsRequestId)
        questionsError.value = t('load_questions_connection_failed');
    } finally {
      if (requestId === questionsRequestId) isLoadingQuestions.value = false;
    }
  }

  async function loadQuestion(id: string): Promise<EditableQuestion | null> {
    questionFormError.value = '';
    try {
      const response = await fetch(`${apiUrl}/api/v1/questions/${id}`, { headers: authorizationHeaders() });
      const data = (await response.json().catch(() => null)) as ({ question?: EditableQuestion } & ApiMessage) | null;
      if (!response.ok || !data?.question) { questionFormError.value = getMessage(data, t('load_questions_failed')); return null; }
      editingQuestion.value = normalizeEditableQuestion(data.question);
      return editingQuestion.value;
    } catch { questionFormError.value = t('load_questions_connection_failed'); return null; }
  }

  async function saveQuestion(input: QuestionFormInput, target: EditableQuestion | null): Promise<boolean> {
    questionFormError.value = ''; isSavingQuestion.value = true;
    try {
      const response = await fetch(target ? `${apiUrl}/api/v1/questions/${target.id}` : `${apiUrl}/api/v1/questions`, {
        method: target ? 'PATCH' : 'POST', headers: { ...authorizationHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      });
      const data = (await response.json().catch(() => null)) as ({ question?: EditableQuestion } & ApiMessage) | null;
      if (!response.ok || !data?.question) { questionFormError.value = getMessage(data, t('save_question_failed')); return false; }
      editingQuestion.value = normalizeEditableQuestion(data.question); return true;
    } catch { questionFormError.value = t('save_question_connection_failed'); return false; }
    finally { isSavingQuestion.value = false; }
  }

  async function publishQuestion(id: string): Promise<boolean> {
    questionsError.value = ''; isPublishingQuestion.value = true;
    try {
      const response = await fetch(`${apiUrl}/api/v1/questions/${id}/publish`, { method: 'POST', headers: authorizationHeaders() });
      const data = (await response.json().catch(() => null)) as (ApiMessage & { pending?: string[] }) | null;
      if (!response.ok) { questionsError.value = data?.pending?.join(' ') || getMessage(data, t('publish_question_failed')); return false; }
      await loadQuestions(); return true;
    } catch { questionsError.value = t('publish_question_connection_failed'); return false; }
    finally { isPublishingQuestion.value = false; }
  }

  async function removeQuestion(id: string): Promise<boolean> {
    questionsError.value = ''; isRemovingQuestion.value = true;
    try {
      const response = await fetch(`${apiUrl}/api/v1/questions/${id}`, { method: 'DELETE', headers: authorizationHeaders() });
      const data = (await response.json().catch(() => null)) as ApiMessage | null;
      if (!response.ok) { questionsError.value = getMessage(data, t('remove_question_failed')); return false; }
      await loadQuestions(); return true;
    } catch { questionsError.value = t('remove_question_connection_failed'); return false; }
    finally { isRemovingQuestion.value = false; }
  }

  async function saveCategory(
    input: CategoryFormInput,
    target: Category | null
  ) {
    saveCategoryError.value = '';
    isSavingCategory.value = true;
    try {
      const response = await fetch(
        target
          ? `${apiUrl}/api/v1/categories/${target.id}`
          : `${apiUrl}/api/v1/categories`,
        {
          method: target ? 'PATCH' : 'POST',
          headers: {
            ...authorizationHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      );
      const data = (await response.json().catch(() => null)) as
        ({ category?: Category } & ApiMessage) | null;
      if (!response.ok || !data?.category) {
        saveCategoryError.value = getMessage(data, t('save_category_failed'));
        return false;
      }
      await loadCategories();
      return true;
    } catch {
      saveCategoryError.value = t('save_category_connection_failed');
      return false;
    } finally {
      isSavingCategory.value = false;
    }
  }

  async function deleteCategory(category: Category) {
    categoriesError.value = '';
    isDeletingCategory.value = true;
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/categories/${category.id}`,
        { method: 'DELETE', headers: authorizationHeaders() }
      );
      const data = (await response
        .json()
        .catch(() => null)) as ApiMessage | null;
      if (!response.ok) {
        categoriesError.value = getMessage(data, t('delete_category_failed'));
        return false;
      }
      await loadCategories();
      return true;
    } catch {
      categoriesError.value = t('delete_category_connection_failed');
      return false;
    } finally {
      isDeletingCategory.value = false;
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
      if (targetUser && input.remove_profile_picture)
        payload.set('remove_profile_picture', 'true');
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
    categories.value = [];
    categoriesTotal.value = 0;
    categoriesPage.value = 1;
    categoriesSearch.value = '';
    questions.value = [];
    questionsTotal.value = 0;
    questionsPage.value = 1;
    questionFilters.value = emptyQuestionFilters();
    questionCategories.value = [];
    sessionStorage.removeItem(questionsStorageKey);
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
    categories,
    categoriesTotal,
    categoriesPage,
    categoriesLimit,
    categoriesSearch,
    questions,
    questionsTotal,
    questionsPage,
    questionsLimit,
    questionFilters,
    questionCategories,
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
    categoriesError,
    saveCategoryError,
    isLoadingCategories,
    isSavingCategory,
    isDeletingCategory,
    questionsError,
    isLoadingQuestions,
    editingQuestion,
    questionFormError,
    isSavingQuestion,
    isPublishingQuestion,
    isRemovingQuestion,
    login,
    restoreSession,
    loadUsers,
    loadDashboard,
    loadRoles,
    loadCountries,
    loadCategories,
    loadQuestions,
    loadQuestion,
    saveQuestion,
    publishQuestion,
    removeQuestion,
    saveUser,
    deleteUser,
    saveCategory,
    deleteCategory,
    logout,
  };
}
