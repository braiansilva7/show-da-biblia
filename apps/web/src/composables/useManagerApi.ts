import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ApiMessage, LoginResponse } from '@/types/api';
import type {
  AuthenticatedUser,
  Country,
  ManagedUser,
  OwnProfileInput,
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
import type {
  ApiPlayerRanking,
  ApiRankingEntry,
  ApiRankingPage,
  MyRankings,
  PlayerRanking,
  RankingEntry,
  RankingPage,
  RankingScope,
} from '@/types/ranking';
import type {
  AnswerFeedback,
  AnswerResult,
  GameQuestion,
  GameSession,
  GameStart,
  GameSummary,
  Joker,
  JokerCode,
  JokerEffect,
} from '@/types/game';

const apiUrl = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3010'
).replace(/\/$/, '');
const tokenStorageKey = 'show-da-biblia.access-token';
const questionsStorageKey = 'show-da-biblia.questions-list';
const rankingPageSize = 20;

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

function normalizeEditableQuestion(
  question: EditableQuestion
): EditableQuestion {
  const languages = ['pt-BR', 'en', 'es'] as const;
  return {
    ...question,
    translations: Object.fromEntries(
      languages.map((language) => [
        language,
        question.translations?.[language] ?? { statement: '', explanation: '' },
      ])
    ) as EditableQuestion['translations'],
    options: question.options.map((option) => ({
      ...option,
      translations: Object.fromEntries(
        languages.map((language) => [
          language,
          option.translations?.[language] ?? { content: '' },
        ])
      ) as typeof option.translations,
    })),
  };
}

function rankingEntry(value: ApiRankingEntry): RankingEntry {
  return {
    position: value.position,
    userId: value.user_id,
    username: value.username,
    countryId: value.country_id,
    countryName: value.country_name,
    profilePictureUrl: value.profile_picture_url,
    score: value.score,
    correctAnswers: value.correct_answers,
    durationSeconds: value.duration_seconds,
  };
}

function rankingPage(value: ApiRankingPage): RankingPage {
  return {
    page: value.page,
    pageSize: value.page_size,
    total: value.total,
    items: value.items.map(rankingEntry),
  };
}

function playerRanking(value: ApiPlayerRanking): PlayerRanking {
  return {
    position: value.position,
    score: value.score,
    correctAnswers: value.correct_answers,
    durationSeconds: value.duration_seconds,
  };
}

const gameSession = (value: any): GameSession => ({ id: value.id, status: value.status, score: value.score, skipsRemaining: value.skips_remaining, currentLevel: value.current_level });
const gameQuestion = (value: any): GameQuestion => ({ sessionQuestionId: value.session_question_id, orderNumber: value.order_number, difficultyLevel: value.difficulty_level, presentedAt: value.presented_at, statement: value.statement, answers: value.answers });
const gameJoker = (value: any): Joker => ({ code: value.code, quantityAvailable: value.quantity_available });
const gameFeedback = (value: any): AnswerFeedback => ({ correctAnswerOptionId: value.correct_answer_option_id, explanation: value.explanation });
const gameSummary = (value: any): GameSummary => ({ id: value.id, endReason: value.end_reason, score: value.score, correctAnswers: value.correct_answers, answeredQuestions: value.answered_questions, skipsUsed: value.skips_used, jokers: value.jokers.map((item: any) => ({ code: item.code, quantityUsed: item.quantity_used })), highestUnlockedLevel: value.highest_unlocked_level, durationSeconds: value.duration_seconds });

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
  const ownProfileError = ref('');
  const isSavingOwnProfile = ref(false);
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
  const isUnpublishingQuestion = ref(false);
  const isRemovingQuestion = ref(false);
  const rankingScope = ref<RankingScope>('national');
  const rankingItems = ref<RankingEntry[]>([]);
  const rankingPageNumber = ref(1);
  const rankingTotal = ref(0);
  const myRankings = ref<MyRankings | null>(null);
  const rankingError = ref('');
  const myRankingError = ref('');
  const isLoadingRanking = ref(false);
  const isLoadingMoreRanking = ref(false);
  let usersRequestId = 0;
  let categoriesRequestId = 0;
  let questionsRequestId = 0;
  let rankingRequestId = 0;

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

  async function gameRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${apiUrl}/api/v1${path}`, {
      ...init,
      headers: { ...authorizationHeaders(), ...init.headers },
    });
    const data = await response.json().catch(() => null) as (T & ApiMessage) | null;
    if (!response.ok || !data) throw new Error(getMessage(data, t('game_action_failed')));
    return data;
  }

  async function startGame(): Promise<GameStart> {
    const data = await gameRequest<any>('/game-sessions', { method: 'POST' });
    return { session: gameSession(data.session), question: gameQuestion(data.question), jokers: data.jokers.map(gameJoker) };
  }
  async function answerGame(sessionId: string, sessionQuestionId: string, answerOptionId: string): Promise<AnswerResult> {
    const data = await gameRequest<any>(`/game-sessions/${sessionId}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_question_id: sessionQuestionId, answer_option_id: answerOptionId }) });
    return data.finished
      ? { finished: true, summary: gameSummary(data.summary), feedback: gameFeedback(data.feedback) }
      : { finished: false, session: gameSession(data.session), question: gameQuestion(data.question), feedback: gameFeedback(data.feedback) };
  }
  async function skipGameQuestion(sessionId: string, sessionQuestionId: string) {
    const data = await gameRequest<any>(`/game-sessions/${sessionId}/skip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_question_id: sessionQuestionId }) });
    return { session: gameSession(data.session), question: gameQuestion(data.question) };
  }
  async function useGameJoker(sessionId: string, sessionQuestionId: string, code: JokerCode): Promise<JokerEffect> {
    const data = await gameRequest<any>(`/game-sessions/${sessionId}/jokers/use`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_question_id: sessionQuestionId, joker_type_code: code }) });
    return { joker: { code: data.session_joker.joker_type_code, quantityAvailable: data.session_joker.quantity_available }, eliminatedOptionIds: data.effect.eliminated_answer_option_ids, revealedOptionId: data.effect.revealed_answer_option_id };
  }
  async function finishGame(sessionId: string) {
    const data = await gameRequest<any>(`/game-sessions/${sessionId}/finish`, { method: 'POST' });
    return { summary: gameSummary(data.summary), feedback: gameFeedback(data.feedback) };
  }
  async function abandonGame(sessionId: string) {
    const response = await fetch(`${apiUrl}/api/v1/game-sessions/${sessionId}/abandon`, { method: 'POST', headers: authorizationHeaders() });
    if (!response.ok && response.status !== 404) {
      const data = await response.json().catch(() => null);
      throw new Error(getMessage(data, t('game_action_failed')));
    }
  }

  async function refreshUser(): Promise<boolean> {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, { headers: authorizationHeaders() });
    const data = await response.json().catch(() => null) as { user?: AuthenticatedUser } | null;
    if (!response.ok || !data?.user) return false;
    user.value = data.user;
    setUserLanguage(data.user);
    return true;
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
      if (!(await refreshUser())) {
        sessionStorage.removeItem(tokenStorageKey);
        return;
      }
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

  async function loadRankings(
    options: {
      scope?: RankingScope;
      page?: number;
      append?: boolean;
    } = {}
  ) {
    const scope = options.scope ?? rankingScope.value;
    const page = options.page ?? 1;
    const append = options.append ?? false;
    const requestId = ++rankingRequestId;
    rankingScope.value = scope;
    if (append) isLoadingMoreRanking.value = true;
    else {
      isLoadingRanking.value = true;
      rankingItems.value = [];
      rankingTotal.value = 0;
      rankingPageNumber.value = 1;
      myRankings.value = null;
      myRankingError.value = '';
    }
    rankingError.value = '';
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/rankings/${scope}?page=${page}&page_size=${rankingPageSize}`,
        { headers: authorizationHeaders() }
      );
      const data = (await response.json().catch(() => null)) as
        (Partial<ApiRankingPage> & ApiMessage) | null;
      if (
        !response.ok ||
        !Array.isArray(data?.items) ||
        typeof data.page !== 'number' ||
        typeof data.page_size !== 'number' ||
        typeof data.total !== 'number'
      ) {
        if (requestId === rankingRequestId)
          rankingError.value = getMessage(data, t('load_ranking_failed'));
        return;
      }
      if (requestId !== rankingRequestId) return;
      const result = rankingPage(data as ApiRankingPage);
      rankingItems.value = append
        ? [...rankingItems.value, ...result.items]
        : result.items;
      rankingPageNumber.value = result.page;
      rankingTotal.value = result.total;
      if (!append) {
        try {
          const myResponse = await fetch(`${apiUrl}/api/v1/rankings/me`, {
            headers: authorizationHeaders(),
          });
          const mine = (await myResponse.json().catch(() => null)) as
            | ({
                international?: ApiPlayerRanking | null;
                national?: ApiPlayerRanking | null;
              } & ApiMessage)
            | null;
          if (
            !myResponse.ok ||
            !mine ||
            !('international' in mine) ||
            !('national' in mine)
          ) {
            if (requestId === rankingRequestId)
              myRankingError.value = getMessage(
                mine,
                t('load_my_ranking_failed')
              );
            return;
          }
          if (requestId !== rankingRequestId) return;
          myRankings.value = {
            international: mine.international
              ? playerRanking(mine.international)
              : null,
            national: mine.national ? playerRanking(mine.national) : null,
          };
        } catch {
          if (requestId === rankingRequestId)
            myRankingError.value = t('load_my_ranking_connection_failed');
        }
      }
    } catch {
      if (requestId === rankingRequestId)
        rankingError.value = t('load_ranking_connection_failed');
    } finally {
      if (requestId === rankingRequestId) {
        isLoadingRanking.value = false;
        isLoadingMoreRanking.value = false;
      }
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
      const response = await fetch(`${apiUrl}/api/v1/questions/${id}`, {
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        ({ question?: EditableQuestion } & ApiMessage) | null;
      if (!response.ok || !data?.question) {
        questionFormError.value = getMessage(data, t('load_questions_failed'));
        return null;
      }
      editingQuestion.value = normalizeEditableQuestion(data.question);
      return editingQuestion.value;
    } catch {
      questionFormError.value = t('load_questions_connection_failed');
      return null;
    }
  }

  async function saveQuestion(
    input: QuestionFormInput,
    target: EditableQuestion | null
  ): Promise<boolean> {
    questionFormError.value = '';
    isSavingQuestion.value = true;
    try {
      const response = await fetch(
        target
          ? `${apiUrl}/api/v1/questions/${target.id}`
          : `${apiUrl}/api/v1/questions`,
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
        ({ question?: EditableQuestion } & ApiMessage) | null;
      if (!response.ok || !data?.question) {
        questionFormError.value = getMessage(data, t('save_question_failed'));
        return false;
      }
      editingQuestion.value = normalizeEditableQuestion(data.question);
      return true;
    } catch {
      questionFormError.value = t('save_question_connection_failed');
      return false;
    } finally {
      isSavingQuestion.value = false;
    }
  }

  async function publishQuestion(id: string): Promise<boolean> {
    questionsError.value = '';
    isPublishingQuestion.value = true;
    try {
      const response = await fetch(`${apiUrl}/api/v1/questions/${id}/publish`, {
        method: 'POST',
        headers: authorizationHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        (ApiMessage & { pending?: string[] }) | null;
      if (!response.ok) {
        questionsError.value =
          data?.pending?.join(' ') ||
          getMessage(data, t('publish_question_failed'));
        return false;
      }
      await loadQuestions();
      return true;
    } catch {
      questionsError.value = t('publish_question_connection_failed');
      return false;
    } finally {
      isPublishingQuestion.value = false;
    }
  }

  async function unpublishQuestion(id: string): Promise<boolean> {
    questionsError.value = '';
    isUnpublishingQuestion.value = true;
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/questions/${id}/unpublish`,
        { method: 'POST', headers: authorizationHeaders() }
      );
      const data = (await response
        .json()
        .catch(() => null)) as ApiMessage | null;
      if (!response.ok) {
        questionsError.value = getMessage(data, t('unpublish_question_failed'));
        return false;
      }
      await loadQuestions();
      return true;
    } catch {
      questionsError.value = t('unpublish_question_connection_failed');
      return false;
    } finally {
      isUnpublishingQuestion.value = false;
    }
  }

  async function removeQuestion(id: string): Promise<boolean> {
    questionsError.value = '';
    isRemovingQuestion.value = true;
    try {
      const response = await fetch(`${apiUrl}/api/v1/questions/${id}`, {
        method: 'DELETE',
        headers: authorizationHeaders(),
      });
      const data = (await response
        .json()
        .catch(() => null)) as ApiMessage | null;
      if (!response.ok) {
        questionsError.value = getMessage(data, t('remove_question_failed'));
        return false;
      }
      await loadQuestions();
      return true;
    } catch {
      questionsError.value = t('remove_question_connection_failed');
      return false;
    } finally {
      isRemovingQuestion.value = false;
    }
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
    const response = await fetch(`${apiUrl}/api/v1/public/countries`);
    const data = (await response.json().catch(() => null)) as {
      countries?: Country[];
    } | null;
    if (response.ok && data?.countries) countries.value = data.countries;
  }

  async function saveOwnProfile(input: OwnProfileInput): Promise<boolean | null> {
    ownProfileError.value = '';
    isSavingOwnProfile.value = true;
    try {
      const payload = new FormData();
      payload.set('username', input.username);
      payload.set('country_id', input.country_id);
      payload.set('language_code', input.language_code);
      if (input.profile_picture)
        payload.set('profile_picture', input.profile_picture);
      if (input.remove_profile_picture)
        payload.set('remove_profile_picture', 'true');
      if (input.password) {
        payload.set('current_password', input.current_password);
        payload.set('password', input.password);
        payload.set('confirm_password', input.confirm_password);
      }
      const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
        method: 'PATCH',
        headers: authorizationHeaders(),
        body: payload,
      });
      const data = (await response.json().catch(() => null)) as
        ({ user?: AuthenticatedUser } & ApiMessage) | null;
      if (!response.ok || !data?.user) {
        ownProfileError.value = getMessage(data, t('save_profile_failed'));
        return null;
      }
      user.value = data.user;
      setUserLanguage(data.user);
      return Boolean(input.password);
    } catch {
      ownProfileError.value = t('save_profile_connection_failed');
      return null;
    } finally {
      isSavingOwnProfile.value = false;
    }
  }

  function clearOwnProfileError() {
    ownProfileError.value = '';
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
    rankingItems.value = [];
    rankingPageNumber.value = 1;
    rankingTotal.value = 0;
    myRankings.value = null;
    rankingError.value = '';
    myRankingError.value = '';
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
    ownProfileError,
    isSavingOwnProfile,
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
    isUnpublishingQuestion,
    isRemovingQuestion,
    rankingScope,
    rankingItems,
    rankingPageNumber,
    rankingTotal,
    myRankings,
    rankingError,
    myRankingError,
    isLoadingRanking,
    isLoadingMoreRanking,
    login,
    restoreSession,
    loadUsers,
    loadDashboard,
    startGame,
    answerGame,
    skipGameQuestion,
    useGameJoker,
    finishGame,
    abandonGame,
    refreshUser,
    loadRankings,
    loadRoles,
    loadCountries,
    saveOwnProfile,
    clearOwnProfileError,
    loadCategories,
    loadQuestions,
    loadQuestion,
    saveQuestion,
    publishQuestion,
    unpublishQuestion,
    removeQuestion,
    saveUser,
    deleteUser,
    saveCategory,
    deleteCategory,
    logout,
  };
}
