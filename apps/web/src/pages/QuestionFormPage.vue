<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { difficultyLevelOptions } from '@/types/difficulty';
import type { EditableQuestion, QuestionCategoryFilter, QuestionFormInput, QuestionLanguage } from '@/types/question';

const props = defineProps<{ question: EditableQuestion | null; categories: QuestionCategoryFilter[]; error: string; isSaving: boolean }>();
const emit = defineEmits<{ save: [input: QuestionFormInput]; cancel: [] }>();
const languages: QuestionLanguage[] = ['pt-BR', 'en', 'es'];
const tab = ref<QuestionLanguage>('pt-BR');
function blank(): QuestionFormInput {
  return { category_id: '', difficulty_level: 1, translations: Object.fromEntries(languages.map((language) => [language, { statement: '', explanation: '' }])) as QuestionFormInput['translations'], options: [1,2,3,4,5].map((position) => ({ position: position as 1|2|3|4|5, is_correct: position === 1, translations: Object.fromEntries(languages.map((language) => [language, { content: '' }])) as QuestionFormInput['options'][number]['translations'] })) };
}
const form = ref<QuestionFormInput>(blank());
watch(() => props.question, (question) => {
  form.value = question ? JSON.parse(JSON.stringify({ category_id: question.category_id, difficulty_level: question.difficulty_level, translations: question.translations, options: question.options })) : blank();
}, { immediate: true });
const activeTranslation = computed(() => form.value.translations[tab.value]);
function markCorrect(position: number) { form.value.options.forEach((option) => option.is_correct = option.position === position); }
function missing() { return !activeTranslation.value.statement || !activeTranslation.value.explanation || form.value.options.some((option) => !option.translations[tab.value].content); }
</script>

<template>
  <section class="page-content question-form-page">
    <div class="page-heading">
      <div><p class="eyebrow">{{ $t('administration') }}</p><h1>{{ question ? $t('edit_question') : $t('new_question') }}</h1><p class="page-subtitle">{{ $t('question_form_subtitle') }}</p></div>
      <v-btn variant="outlined" @click="emit('cancel')">{{ $t('cancel') }}</v-btn>
    </div>
    <div class="question-editor-grid">
      <article class="data-card question-editor">
        <div class="form-grid">
          <v-select v-model="form.category_id" :items="categories" item-title="name" item-value="id" :label="$t('category_name')" variant="outlined" density="comfortable" />
          <v-select v-model="form.difficulty_level" :items="difficultyLevelOptions.map((item) => ({ ...item, title: $t(item.labelKey) }))" item-title="title" item-value="value" :label="$t('difficulty')" variant="outlined" density="comfortable" />
        </div>
        <v-tabs v-model="tab" class="language-tabs"><v-tab v-for="language in languages" :key="language" :value="language">{{ language }}</v-tab></v-tabs>
        <p v-if="missing()" class="draft-warning">{{ $t('question_draft_missing_content') }}</p>
        <v-textarea v-model="activeTranslation.statement" :label="$t('question_statement')" variant="outlined" rows="3" />
        <v-textarea v-model="activeTranslation.explanation" :label="$t('question_explanation')" variant="outlined" rows="3" />
        <h2>{{ $t('answer_options') }}</h2>
        <div v-for="option in form.options" :key="option.position" :class="['option-row', { 'option-row--correct': option.is_correct }]">
          <input
            :id="`correct-answer-${option.position}`"
            class="correct-answer-control"
            type="radio"
            name="correct-answer"
            :checked="option.is_correct"
            :aria-label="$t('correct_answer')"
            @change="markCorrect(option.position)"
          />
          <v-text-field v-model="option.translations[tab].content" :label="$t('option_number', { number: option.position })" variant="outlined" hide-details />
        </div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="form-actions"><v-btn variant="outlined" @click="emit('cancel')">{{ $t('cancel') }}</v-btn><v-btn color="primary" :loading="isSaving" @click="emit('save', form)">{{ $t('save_question') }}</v-btn></div>
      </article>
      <aside class="question-preview"><p class="eyebrow">{{ $t('preview') }} · {{ tab }}</p><h2>{{ activeTranslation.statement || $t('question_without_statement') }}</h2><ol><li v-for="option in form.options" :key="option.position">{{ option.translations[tab].content || $t('question_option_missing') }}</li></ol></aside>
    </div>
  </section>
</template>

<style scoped>
.question-editor-grid { display:grid; grid-template-columns:minmax(0, 1.6fr) minmax(260px, .8fr); gap:1.5rem; }
.question-editor { padding:1.5rem; }.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }.language-tabs { margin: .5rem 0 1rem; }.draft-warning { color:#b76a12; background:#ff9f4326; padding:.75rem; border-radius:.4rem; }.option-row { display:grid; grid-template-columns:1.5rem minmax(0, 1fr); align-items:center; gap:.55rem; margin:.6rem 0; padding:.2rem; border:1px solid transparent; border-radius:.4rem; }.option-row--correct { background:#28c76f0d; border-color:#28c76f4d; }.correct-answer-control { appearance:auto; accent-color:#28c76f; cursor:pointer; height:1.1rem; margin:0; padding:0; width:1.1rem; }.form-actions { display:flex; justify-content:flex-end; gap:.75rem; margin-top:1.5rem; }.question-preview { background:#fff; border:1px solid #e7e5ed; border-radius:.5rem; padding:1.5rem; height:max-content; }.question-preview li { margin:.75rem 0; } @media(max-width:959px){.question-editor-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}}
</style>
