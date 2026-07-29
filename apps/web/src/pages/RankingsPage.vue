<script setup lang="ts">
import { computed } from 'vue';
import type { AuthenticatedUser } from '@/types/user';
import type { MyRankings, RankingEntry, RankingScope } from '@/types/ranking';
import { formatDuration } from '@/utils/formatters';

const props = defineProps<{
  user: AuthenticatedUser;
  scope: RankingScope;
  items: RankingEntry[];
  page: number;
  total: number;
  mine: MyRankings | null;
  error: string;
  myError: string;
  isLoading: boolean;
  isLoadingMore: boolean;
}>();
const emit = defineEmits<{
  load: [options: { scope?: RankingScope; page?: number; append?: boolean }];
}>();

const hasMore = computed(() => props.items.length < props.total);
const myRanking = computed(() => props.mine?.[props.scope] ?? null);

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function changeScope(scope: RankingScope) {
  if (scope !== props.scope) emit('load', { scope, page: 1 });
}
</script>

<template>
  <section class="page-content rankings-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">{{ $t('ranking') }}</p>
        <h1>{{ $t('ranking') }}</h1>
        <p class="page-subtitle">{{ $t('ranking_subtitle') }}</p>
      </div>
    </div>

    <div class="ranking-tabs" role="tablist" :aria-label="$t('ranking')">
      <v-btn
        :class="{ active: scope === 'national' }"
        :aria-selected="scope === 'national'"
        role="tab"
        variant="text"
        @click="changeScope('national')"
        >{{ $t('national_ranking') }}</v-btn
      >
      <v-btn
        :class="{ active: scope === 'international' }"
        :aria-selected="scope === 'international'"
        role="tab"
        variant="text"
        @click="changeScope('international')"
        >{{ $t('international_ranking') }}</v-btn
      >
    </div>

    <article class="data-card ranking-card">
      <p v-if="error" class="form-error" role="alert">
        {{ error }}
        <v-btn
          size="small"
          variant="text"
          @click="emit('load', { scope, page: 1 })"
        >
          {{ $t('retry') }}
        </v-btn>
      </p>
      <p v-else-if="isLoading" class="empty-state">
        {{ $t('loading_ranking') }}
      </p>
      <p v-else-if="!items.length" class="empty-state">
        {{ $t('ranking_empty') }}
      </p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ $t('position') }}</th>
              <th>{{ $t('user') }}</th>
              <th>{{ $t('country') }}</th>
              <th>{{ $t('score') }}</th>
              <th>{{ $t('correct_answers') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in items" :key="entry.userId">
              <td class="ranking-position">
                #{{ entry.position }} ·
                {{ formatDuration(entry.durationSeconds) }}
              </td>
              <td>
                <div class="user-summary">
                  <img
                    v-if="entry.profilePictureUrl"
                    :src="entry.profilePictureUrl"
                    :alt="entry.username"
                    class="user-avatar"
                  />
                  <span v-else class="user-avatar user-avatar-fallback">{{
                    initials(entry.username)
                  }}</span>
                  <strong>{{ entry.username }}</strong>
                </div>
              </td>
              <td>{{ entry.countryName }}</td>
              <td>
                <strong>{{ entry.score }}</strong>
              </td>
              <td>{{ entry.correctAnswers }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="hasMore && !error" class="ranking-load-more">
        <v-btn
          color="primary"
          :loading="isLoadingMore"
          :disabled="isLoadingMore"
          variant="flat"
          @click="emit('load', { scope, page: page + 1, append: true })"
          >{{ $t('load_more') }}</v-btn
        >
      </div>
    </article>

    <article v-if="!error && (mine || myError)" class="my-ranking-card">
      <h2>{{ $t('your_ranking') }}</h2>
      <template v-if="myRanking">
        <div class="my-ranking-content">
          <img
            v-if="user.profile_picture_url"
            :src="user.profile_picture_url"
            :alt="user.username"
            class="user-avatar"
          />
          <span v-else class="user-avatar user-avatar-fallback">{{
            initials(user.username)
          }}</span>
          <strong>{{ user.username }}</strong>
          <span
            >#{{ myRanking.position }} ·
            {{ formatDuration(myRanking.durationSeconds) }}</span
          >
          <span class="my-ranking-score"
            >{{ myRanking.score }} {{ $t('score') }} ·
            {{ myRanking.correctAnswers }} {{ $t('correct_answers') }}</span
          >
        </div>
      </template>
      <p v-else-if="!myError" class="empty-state">
        {{ $t('ranking_unranked') }}
      </p>
      <p v-if="myError" class="ranking-my-error" role="status">{{ myError }}</p>
    </article>
  </section>
</template>
