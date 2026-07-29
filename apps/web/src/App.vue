<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LoginForm from '@/components/auth/LoginForm.vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import RankingsPage from '@/pages/RankingsPage.vue';
import UsersPage from '@/pages/UsersPage.vue';
import CategoriesPage from '@/pages/CategoriesPage.vue';
import QuestionsPage from '@/pages/QuestionsPage.vue';
import QuestionFormPage from '@/pages/QuestionFormPage.vue';
import { useManagerApi } from '@/composables/useManagerApi';
import type { Page } from '@/types/navigation';
import type { ManagedUser, UserFormInput } from '@/types/user';
import type { Category, CategoryFormInput } from '@/types/category';
import type { EditableQuestion, QuestionFormInput } from '@/types/question';
import type { RankingScope } from '@/types/ranking';

const api = useManagerApi();
const {
  user,
  users,
  usersTotal,
  usersPage,
  usersLimit,
  usersSearch,
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
  categories,
  categoriesTotal,
  categoriesPage,
  categoriesLimit,
  categoriesSearch,
  categoriesError,
  saveCategoryError,
  isLoadingCategories,
  isSavingCategory,
  isDeletingCategory,
  questions,
  questionsTotal,
  questionsPage,
  questionsLimit,
  questionFilters,
  questionCategories,
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
} = api;
const currentPage = ref<Page>('dashboard');
const canManageUsers = computed(
  () => user.value?.permissions.includes('users.view') ?? false
);
const canManageCategories = computed(
  () => user.value?.permissions.includes('categories.view') ?? false
);
const canViewQuestions = computed(
  () => user.value?.permissions.includes('questions.view') ?? false
);
const canCreateQuestions = computed(
  () => user.value?.permissions.includes('questions.create') ?? false
);
const canUpdateQuestions = computed(
  () => user.value?.permissions.includes('questions.update') ?? false
);
const canPublishQuestions = computed(
  () => user.value?.permissions.includes('questions.publish') ?? false
);
const canDeleteQuestions = computed(
  () => user.value?.permissions.includes('questions.delete') ?? false
);
const isPlayer = computed(() => user.value?.permission_role?.code === 'PLAYER');
const canViewAdministrativeDashboard = computed(
  () =>
    (user.value?.permissions.includes('dashboard.view') ?? false) &&
    !isPlayer.value
);

async function openUsers() {
  if (!canManageUsers.value) return;
  currentPage.value = 'users';
  await Promise.all([api.loadUsers(), api.loadRoles(), api.loadCountries()]);
}
async function openCategories() {
  if (!canManageCategories.value) return;
  currentPage.value = 'categories';
  await api.loadCategories();
}
async function openQuestions() {
  if (!canViewQuestions.value) return;
  currentPage.value = 'questions';
  await api.loadQuestions();
}
async function openRankings(
  options: {
    scope?: RankingScope;
    page?: number;
    append?: boolean;
  } = {}
) {
  currentPage.value = 'ranking';
  await api.loadRankings(options);
}
async function openQuestionForm(id?: string) {
  if (id ? !canUpdateQuestions.value : !canCreateQuestions.value) return;
  if (!questionCategories.value.length) await api.loadQuestions();
  if (id) {
    const question = await api.loadQuestion(id);
    if (!question) return;
  } else editingQuestion.value = null;
  currentPage.value = 'question-form';
}
async function saveQuestion(input: QuestionFormInput) {
  if (await api.saveQuestion(input, editingQuestion.value))
    await openQuestions();
}
async function publishQuestion(id: string) {
  await api.publishQuestion(id);
}
async function unpublishQuestion(id: string) {
  await api.unpublishQuestion(id);
}
async function removeQuestion(id: string) {
  await api.removeQuestion(id);
}

function navigate(page: Page) {
  if (page === 'users') void openUsers();
  else if (page === 'categories') void openCategories();
  else if (page === 'questions') void openQuestions();
  else if (page === 'ranking') void openRankings();
  else {
    currentPage.value = page;
    if (page === 'dashboard' && canViewAdministrativeDashboard.value)
      void api.loadDashboard();
    else if (
      page === 'dashboard' &&
      !user.value?.permissions.includes('dashboard.view')
    )
      void openRankings();
  }
}

async function continueAfterAuthentication() {
  if (!user.value) return;
  if (user.value.permissions.includes('dashboard.view')) {
    currentPage.value = 'dashboard';
    if (canViewAdministrativeDashboard.value) await api.loadDashboard();
    return;
  }
  await openRankings();
}

async function login(email: string, password: string) {
  await api.login(email, password);
  await continueAfterAuthentication();
}

async function saveUser(input: UserFormInput, target: ManagedUser | null) {
  return api.saveUser(input, target);
}

async function deleteUser(user: ManagedUser) {
  return api.deleteUser(user);
}
async function saveCategory(input: CategoryFormInput, target: Category | null) {
  return api.saveCategory(input, target);
}
async function deleteCategory(category: Category) {
  return api.deleteCategory(category);
}
function logout() {
  api.logout();
  currentPage.value = 'dashboard';
}

onMounted(async () => {
  await api.restoreSession();
  await continueAfterAuthentication();
});
</script>

<template>
  <v-app>
    <LoginForm
      v-if="!user"
      :error="loginError"
      :is-submitting="isLoggingIn"
      @submit="({ email, password }) => login(email, password)"
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
      <RankingsPage
        v-else-if="currentPage === 'ranking'"
        :user="user"
        :scope="rankingScope"
        :items="rankingItems"
        :page="rankingPageNumber"
        :total="rankingTotal"
        :mine="myRankings"
        :error="rankingError"
        :my-error="myRankingError"
        :is-loading="isLoadingRanking"
        :is-loading-more="isLoadingMoreRanking"
        @load="openRankings"
      />
      <UsersPage
        v-else-if="currentPage === 'users'"
        :users="users"
        :total="usersTotal"
        :page="usersPage"
        :limit="usersLimit"
        :search="usersSearch"
        :roles="roles"
        :countries="countries"
        :error="usersError"
        :is-loading="isLoadingUsers"
        :is-saving="isSavingUser"
        :save-error="saveUserError"
        :is-deleting="isDeletingUser"
        :save-user="saveUser"
        :delete-user="deleteUser"
        @search="api.loadUsers"
      />
      <CategoriesPage
        v-else-if="currentPage === 'categories'"
        :categories="categories"
        :total="categoriesTotal"
        :page="categoriesPage"
        :limit="categoriesLimit"
        :search="categoriesSearch"
        :permissions="user.permissions"
        :error="categoriesError"
        :is-loading="isLoadingCategories"
        :is-saving="isSavingCategory"
        :save-error="saveCategoryError"
        :is-deleting="isDeletingCategory"
        :save-category="saveCategory"
        :delete-category="deleteCategory"
        @search="api.loadCategories"
      />
      <QuestionsPage
        v-else-if="currentPage === 'questions'"
        :questions="questions"
        :total="questionsTotal"
        :page="questionsPage"
        :limit="questionsLimit"
        :filters="questionFilters"
        :categories="questionCategories"
        :error="questionsError"
        :is-loading="isLoadingQuestions"
        :can-create="canCreateQuestions"
        :can-update="canUpdateQuestions"
        :can-publish="canPublishQuestions"
        :can-delete="canDeleteQuestions"
        :is-publishing="isPublishingQuestion"
        :is-unpublishing="isUnpublishingQuestion"
        :is-removing="isRemovingQuestion"
        @search="api.loadQuestions"
        @create="openQuestionForm()"
        @edit="openQuestionForm"
        @publish="publishQuestion"
        @unpublish="unpublishQuestion"
        @remove="removeQuestion"
      />
      <QuestionFormPage
        v-else-if="currentPage === 'question-form'"
        :question="editingQuestion"
        :categories="questionCategories"
        :error="questionFormError"
        :is-saving="isSavingQuestion"
        @save="saveQuestion"
        @cancel="openQuestions"
      />
    </AppLayout>
  </v-app>
</template>
