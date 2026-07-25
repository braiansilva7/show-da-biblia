<script setup lang="ts">
import { ref, watch } from 'vue';
import { difficultyLevelOptions } from '@/types/difficulty';
import type {
  QuestionCategoryFilter,
  QuestionFilters,
  QuestionListItem,
} from '@/types/question';
import { formatDate } from '@/utils/formatters';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  questions: QuestionListItem[];
  total: number;
  page: number;
  limit: number;
  filters: QuestionFilters;
  categories: QuestionCategoryFilter[];
  error: string;
  isLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canDelete: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isRemoving: boolean;
}>();
const emit = defineEmits<{
  search: [
    options: {
      page?: number;
      limit?: number;
      filters?: Partial<QuestionFilters>;
    },
  ];
  create: [];
  edit: [id: string];
  publish: [id: string];
  unpublish: [id: string];
  remove: [id: string];
}>();
const { locale } = useI18n();
const form = ref<QuestionFilters>({ ...props.filters });
const removalTarget = ref<QuestionListItem | null>(null);
const totalPages = () => Math.max(1, Math.ceil(props.total / props.limit));

watch(
  () => props.filters,
  (value) => {
    form.value = { ...value };
  },
  { deep: true }
);
function search() {
  emit('search', { page: 1, filters: { ...form.value } });
}
function resetFilters() {
  form.value = {
    search: '',
    category_id: '',
    difficulty_level: null,
    status: null,
    author: '',
    created_from: '',
    created_to: '',
  };
}
function statusKey(status: QuestionListItem['status']) {
  return `question_status_${status.toLowerCase()}`;
}
function completeLabel(question: QuestionListItem) {
  return question.is_complete ? 'question_complete' : 'question_incomplete';
}
function confirmRemoval() {
  if (!removalTarget.value) return;
  emit('remove', removalTarget.value.id);
  removalTarget.value = null;
}
</script>

<template>
  <section class="page-content users-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">{{ $t('administration') }}</p>
        <h1>{{ $t('questions') }}</h1>
        <p class="page-subtitle">{{ $t('questions_subtitle') }}</p>
      </div>
      <v-btn v-if="canCreate" color="primary" @click="emit('create')">{{ $t('new_question') }}</v-btn>
    </div>
    <article class="data-card">
      <div class="data-card-header">
        <div>
          <h2>{{ $t('all_questions') }}</h2>
          <p>{{ $t('questions_found', { count: total }) }}</p>
        </div>
      </div>
      <div class="question-filters">
        <input
          v-model="form.search"
          type="search"
          :placeholder="$t('questions_search_placeholder')"
        />
        <select v-model="form.category_id">
          <option value="">{{ $t('all_categories') }}</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
        <select v-model="form.difficulty_level">
          <option :value="null">{{ $t('all_difficulties') }}</option>
          <option
            v-for="option in difficultyLevelOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ $t(option.labelKey) }}
          </option>
        </select>
        <select v-model="form.status">
          <option :value="null">{{ $t('all_statuses') }}</option>
          <option value="DRAFT">{{ $t('question_status_draft') }}</option>
          <option value="PUBLISHED">
            {{ $t('question_status_published') }}
          </option>
          <option value="ARCHIVED">{{ $t('question_status_archived') }}</option>
        </select>
        <input
          v-model="form.author"
          type="search"
          :placeholder="$t('questions_author_placeholder')"
        />
        <input
          v-model="form.created_from"
          type="date"
          :aria-label="$t('created_from')"
        />
        <input
          v-model="form.created_to"
          type="date"
          :aria-label="$t('created_to')"
        />
        <v-btn color="primary" type="button" @click="search">{{
          $t('search_questions')
        }}</v-btn>
        <v-btn variant="outlined" type="button" @click="resetFilters">{{
          $t('clear_filters')
        }}</v-btn>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-else-if="isLoading" class="empty-state">
        {{ $t('loading_questions') }}
      </p>
      <p v-else-if="!questions.length" class="empty-state">
        {{ $t('no_questions') }}
      </p>
      <div v-else class="table-wrap">
        <table class="questions-table">
          <thead>
            <tr>
              <th>{{ $t('question') }}</th>
              <th>{{ $t('category_name') }}</th>
              <th>{{ $t('difficulty') }}</th>
              <th>{{ $t('status') }}</th>
              <th>{{ $t('author') }}</th>
              <th>{{ $t('completeness') }}</th>
              <th>{{ $t('registered_at') }}</th>
              <th v-if="canUpdate || canPublish || canDelete" class="actions-column">
                {{ $t('actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="question in questions" :key="question.id">
              <td>
                <strong>{{
                  question.statement_preview || $t('question_without_statement')
                }}</strong
                ><span
                  v-if="question.statement_language"
                  class="question-language"
                  >{{ question.statement_language }}</span
                >
              </td>
              <td>{{ question.category.name }}</td>
              <td>
                {{
                  $t(
                    difficultyLevelOptions.find(
                      (option) => option.value === question.difficulty_level
                    )?.labelKey ?? 'difficulty_easy'
                  )
                }}
              </td>
              <td>
                <span
                  :class="[
                    'tag',
                    `question-status-${question.status.toLowerCase()}`,
                  ]"
                  >{{ $t(statusKey(question.status)) }}</span
                >
              </td>
              <td>{{ question.author.username }}</td>
              <td>
                <span
                  :class="[
                    'tag',
                    question.is_complete ? 'active-tag' : 'inactive-tag',
                  ]"
                  >{{ $t(completeLabel(question)) }}</span
                ><span class="question-completeness"
                  >{{ question.languages.join(', ') || '-' }} ·
                  {{ question.answer_options_count }}/5 ·
                  {{ question.correct_answers_count }}/1</span
                >
              </td>
              <td>{{ formatDate(question.created_at, locale) }}</td>
              <td
                v-if="canUpdate || canPublish || canDelete"
                class="actions-column"
              >
                <div class="row-actions">
                  <v-tooltip
                    v-if="canUpdate"
                    :text="$t('edit_question')"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        class="row-action-button"
                        :aria-label="$t('edit_question')"
                        icon
                        type="button"
                        variant="text"
                        @click="emit('edit', question.id)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5Z" />
                          <path d="m13.5 7 3.5 3.5" />
                        </svg>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip
                    v-if="canPublish && question.status !== 'PUBLISHED'"
                    :text="$t('publish_question')"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        class="row-action-button"
                        :aria-label="$t('publish_question')"
                        icon
                        type="button"
                        variant="text"
                        :loading="isPublishing"
                        @click="emit('publish', question.id)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 16V6" />
                          <path d="m8 10 4-4 4 4" />
                          <path d="M5 18h14" />
                        </svg>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip
                    v-if="canPublish && question.status === 'PUBLISHED'"
                    :text="$t('unpublish_question')"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        class="row-action-button"
                        :aria-label="$t('unpublish_question')"
                        icon
                        type="button"
                        variant="text"
                        :loading="isUnpublishing"
                        @click="emit('unpublish', question.id)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 8v10" />
                          <path d="m8 14 4 4 4-4" />
                          <path d="M5 6h14" />
                        </svg>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip
                    v-if="canDelete"
                    :text="$t('remove_question')"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        class="row-action-button danger-action"
                        :aria-label="$t('remove_question')"
                        icon
                        type="button"
                        variant="text"
                        @click="removalTarget = question"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M5 7h14M10 11v5M14 11v5M9 7l1-2h4l1 2M7 7l1 13h8l1-13"
                          />
                        </svg>
                      </v-btn>
                    </template>
                  </v-tooltip>
                </div>
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
          :label="$t('questions_per_page')"
          density="compact"
          hide-details
          variant="outlined"
          :disabled="isLoading"
          @update:model-value="
            (value) => emit('search', { page: 1, limit: Number(value) })
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
            @update:model-value="(value) => emit('search', { page: value })"
          />
        </div>
      </footer>
    </article>
    <v-dialog :model-value="Boolean(removalTarget)" max-width="460" @update:model-value="(open) => { if (!open) removalTarget = null }">
      <v-card>
        <v-card-title>{{ $t('remove_question') }}</v-card-title>
        <v-card-text>{{ $t('remove_question_confirmation', { name: removalTarget?.statement_preview || $t('question_without_statement') }) }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" :disabled="isRemoving" @click="removalTarget = null">{{ $t('cancel') }}</v-btn><v-btn color="error" :loading="isRemoving" @click="confirmRemoval">{{ $t('remove_question') }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.question-filters {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 1rem 1.5rem;
}
.question-language,
.question-completeness {
  color: #797586;
  display: block;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
.question-status-draft {
  background: #ff9f4326;
  color: #b76a12;
}
.question-status-published {
  background: #28c76f26;
  color: #1f9d55;
}
.question-status-archived {
  background: #79758626;
  color: #5d596c;
}
.actions-column {
  width: 1%;
  white-space: nowrap;
}
.questions-table .row-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0.15rem;
  justify-content: flex-start;
  width: max-content;
}
@media (max-width: 959px) {
  .question-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 599px) {
  .question-filters {
    grid-template-columns: 1fr;
  }
}
</style>
