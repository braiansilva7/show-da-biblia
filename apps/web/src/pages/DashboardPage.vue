<script setup lang="ts">
import { computed } from 'vue';
import type { AuthenticatedUser } from '@/types/user';
import type { DashboardSummary } from '@/types/dashboard';

const props = defineProps<{
  user: AuthenticatedUser;
  summary: DashboardSummary | null;
  error: string;
  isLoading: boolean;
  reload: () => Promise<void>;
}>();
const isPlayer = computed(() => props.user.permission_role?.code === 'PLAYER');
</script>

<template>
  <section class="page-content dashboard-page">
    <template v-if="isPlayer">
      <h1>{{ $t('dashboard_greeting', { name: user.username }) }}</h1>
      <p class="page-subtitle">{{ $t('player_welcome') }}</p>
    </template>
    <template v-else>
      <p class="eyebrow">{{ $t('dashboard_eyebrow') }}</p>
      <h1>{{ $t('dashboard_greeting', { name: user.username }) }}</h1>
      <p class="page-subtitle">{{ $t('dashboard_subtitle') }}</p>
      <p v-if="error" class="form-error" role="alert">
        {{ error }}
        <v-btn variant="text" size="small" @click="reload">{{
          $t('retry')
        }}</v-btn>
      </p>
      <p v-else-if="isLoading" class="empty-state">
        {{ $t('loading_dashboard') }}
      </p>
      <div v-else-if="summary" class="dashboard-metrics">
        <article class="metric-card">
          <span>{{ $t('active_users') }}</span
          ><strong>{{ summary.activeUsers }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ $t('published_questions') }}</span
          ><strong>{{ summary.publishedQuestions }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ $t('questions_easy') }}</span
          ><strong>{{ summary.questionsByDifficulty.easy }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ $t('questions_medium') }}</span
          ><strong>{{ summary.questionsByDifficulty.medium }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ $t('questions_hard') }}</span
          ><strong>{{ summary.questionsByDifficulty.hard }}</strong>
        </article>
      </div>
      <p v-else class="empty-state">{{ $t('dashboard_empty') }}</p>
    </template>
  </section>
</template>
