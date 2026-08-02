<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AnswerFeedback, GameQuestion, GameSession, GameStart, GameSummary, Joker, JokerCode } from '@/types/game';
import GameIcon from '@/components/game/GameIcon.vue';

const props = defineProps<{
  start: () => Promise<GameStart>;
  answer: (sessionId: string, sessionQuestionId: string, answerOptionId: string) => Promise<any>;
  skip: (sessionId: string, sessionQuestionId: string) => Promise<{ session: GameSession; question: GameQuestion }>;
  useJoker: (sessionId: string, sessionQuestionId: string, code: JokerCode) => Promise<any>;
  finish: (sessionId: string) => Promise<{ summary: GameSummary; feedback: AnswerFeedback }>;
}>();
const emit = defineEmits<{ active: [id: string | null]; finished: [summary: GameSummary] }>();
const session = ref<GameSession | null>(null);
const question = ref<GameQuestion | null>(null);
const jokers = ref<Joker[]>([]);
const eliminated = ref<string[]>([]);
const revealed = ref<string>();
const feedback = ref<AnswerFeedback | null>(null);
const selected = ref<string>();
const next = ref<{ session: GameSession; question: GameQuestion }>();
const summary = ref<GameSummary>();
const seconds = ref(60);
const busy = ref(false);
const error = ref('');
let timer: number | undefined;
const isTimedOut = computed(() => summary.value?.endReason === 'TIMEOUT');
function accept(nextSession: GameSession, nextQuestion: GameQuestion) {
  session.value = nextSession; question.value = nextQuestion; eliminated.value = []; revealed.value = undefined; feedback.value = null; selected.value = undefined; next.value = undefined; summary.value = undefined;
  seconds.value = Math.max(0, 60 - Math.floor((Date.now() - new Date(nextQuestion.presentedAt).getTime()) / 1000));
}
async function load() {
  busy.value = true; error.value = '';
  try { const started = await props.start(); accept(started.session, started.question); jokers.value = started.jokers; emit('active', started.session.id); }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'game_start_failed'; }
  finally { busy.value = false; }
}
async function run(action: () => Promise<void>) {
  if (busy.value || feedback.value) return;
  busy.value = true; error.value = '';
  try { await action(); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'game_action_failed'; } finally { busy.value = false; }
}
function applyAnswer(result: any, answerId?: string) {
  feedback.value = result.feedback; selected.value = answerId;
  if (result.finished) { summary.value = result.summary; emit('active', null); }
  else next.value = { session: result.session, question: result.question };
}
function answer(answerId: string) { void run(async () => { if (!session.value || !question.value) return; applyAnswer(await props.answer(session.value.id, question.value.sessionQuestionId, answerId), answerId); }); }
function skip() { void run(async () => { if (!session.value || !question.value) return; const result = await props.skip(session.value.id, question.value.sessionQuestionId); accept(result.session, result.question); }); }
function useJoker(code: JokerCode) { void run(async () => { if (!session.value || !question.value) return; const effect = await props.useJoker(session.value.id, question.value.sessionQuestionId, code); jokers.value = jokers.value.map((item) => item.code === effect.joker.code ? effect.joker : item); eliminated.value = [...new Set([...eliminated.value, ...effect.eliminatedOptionIds])]; if (effect.revealedOptionId) { revealed.value = effect.revealedOptionId; applyAnswer(await props.answer(session.value.id, question.value.sessionQuestionId, effect.revealedOptionId), effect.revealedOptionId); } }); }
function advance() { if (summary.value) emit('finished', summary.value); else if (next.value) accept(next.value.session, next.value.question); }
async function timeout() { if (!session.value || busy.value || feedback.value) return; busy.value = true; try { const result = await props.finish(session.value.id); feedback.value = result.feedback; summary.value = result.summary; emit('active', null); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'game_action_failed'; } finally { busy.value = false; } }
onMounted(async () => { await load(); timer = window.setInterval(() => { if (!question.value || busy.value || feedback.value) return; seconds.value = Math.max(0, 60 - Math.floor((Date.now() - new Date(question.value.presentedAt).getTime()) / 1000)); if (seconds.value === 0) void timeout(); }, 250); });
onBeforeUnmount(() => { if (timer) window.clearInterval(timer); });
</script>

<template>
  <section class="page-content game-page">
    <div class="page-heading"><div><p class="eyebrow">{{ $t('start_game') }}</p><h1>{{ $t('game_title') }}</h1><p class="page-subtitle">{{ $t('game_subtitle') }}</p></div></div>
    <div v-if="!question || !session" class="data-card game-state"><p v-if="error" class="form-error">{{ error }}</p><p v-else class="empty-state">{{ $t('game_loading') }}</p><v-btn v-if="error" color="primary" @click="load">{{ $t('retry') }}</v-btn></div>
    <template v-else>
      <div class="game-metrics"><article><GameIcon name="level" /><span>{{ $t('level') }}</span><strong>{{ session.currentLevel }} · {{ (session.score % 10) + 1 }}/10</strong></article><article><GameIcon name="score" /><span>{{ $t('game_score') }}</span><strong>{{ session.score }}</strong></article><article :class="{ danger: seconds < 15 || isTimedOut }"><GameIcon name="time" /><span>{{ $t('time') }}</span><strong>{{ seconds }}s</strong></article></div>
      <article class="game-card"><h2>{{ question.statement }}</h2><div class="game-answers"><template v-for="item in question.answers" :key="item.id"><button :disabled="busy || Boolean(feedback) || eliminated.includes(item.id)" :class="{ eliminated: eliminated.includes(item.id), correct: feedback?.correctAnswerOptionId === item.id || revealed === item.id, wrong: selected === item.id && feedback?.correctAnswerOptionId !== item.id }" @click="answer(item.id)"><span>{{ item.position }}. {{ item.content }}</span><GameIcon v-if="feedback?.correctAnswerOptionId === item.id || revealed === item.id" name="correct" /><GameIcon v-else-if="selected === item.id" name="wrong" /></button><div v-if="feedback?.correctAnswerOptionId === item.id" class="explanation"><strong>{{ $t('answer_explanation') }}</strong><span>{{ feedback.explanation }}</span></div></template></div>
        <v-btn v-if="feedback" class="next-button" color="primary" :loading="busy" @click="advance">{{ summary ? $t('view_result') : $t('next_question') }}</v-btn>
        <div v-else class="game-actions"><button :class="['action-card', { exhausted: session.skipsRemaining === 0 }]" :disabled="busy || session.skipsRemaining === 0" @click="skip"><GameIcon name="skip" /><span><strong>{{ $t('skip_question') }}</strong><small>{{ session.skipsRemaining }} {{ $t('available') }}</small></span></button><button v-for="joker in jokers" :key="joker.code" :class="['action-card', { exhausted: joker.quantityAvailable === 0 }]" :disabled="busy || joker.quantityAvailable === 0" @click="useJoker(joker.code)"><GameIcon :name="joker.code === 'REVEAL_ANSWER' ? 'reveal' : 'eliminate'" /><span><strong>{{ $t(joker.code === 'REVEAL_ANSWER' ? 'joker_reveal' : 'joker_eliminate') }}</strong><small>{{ joker.quantityAvailable }} {{ $t('available') }}</small></span></button></div>
        <p v-if="error" class="form-error">{{ error }}</p></article>
    </template>
  </section>
</template>

<style scoped>
.game-page{max-width:900px}.game-state,.game-card{padding:1.5rem}.game-card{background:#fff;border:1px solid #e7e5ef;border-radius:12px;box-shadow:0 2px 8px #2f2b3d0a}.game-metrics{display:grid;gap:.75rem;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:1.25rem}.game-metrics article{align-items:center;background:#fff;border:1px solid #e7e5ef;border-radius:12px;display:grid;gap:3px;justify-items:center;padding:1rem}.game-metrics .game-icon{color:#7f4f24}.game-metrics span{color:#797586;font-size:.78rem}.game-metrics strong{font-size:1.05rem}.danger{background:#fce8e6!important;border-color:#ea5455!important;color:#b42318}.danger .game-icon{color:#ea5455}.game-card h2{font-size:1.45rem;line-height:1.45;margin:0}.game-answers{display:grid;gap:.75rem;margin:1.5rem 0}.game-answers button{align-items:center;background:#fff;border:1px solid #dbdae1;border-radius:10px;color:#2f2b3d;display:flex;font:inherit;gap:.75rem;justify-content:space-between;padding:1rem;text-align:left;width:100%}.game-answers button span{flex:1}.game-answers button:not(:disabled):hover{background:#f7efe7;border-color:#7f4f24}.game-answers button.correct{background:#ddf4e5;border-color:#28c76f}.game-answers button.correct .game-icon{color:#28c76f}.game-answers button.wrong{background:#fce8e6;border-color:#ea5455}.game-answers button.wrong .game-icon{color:#ea5455}.game-answers button.eliminated{opacity:.45}.explanation{background:#edf8f1;border-radius:0 0 10px 10px;display:grid;gap:.35rem;margin-top:-.75rem;padding:1rem;padding-top:1.25rem}.explanation strong{color:#28c76f}.next-button{width:100%}.game-actions{display:grid;gap:.75rem}.action-card{align-items:center;background:#fff;border:1px solid #e7e5ef;border-radius:10px;color:#2f2b3d;display:flex;gap:1rem;padding:1rem;text-align:left}.action-card:not(:disabled):hover{background:#f7efe7;border-color:#7f4f24}.action-card .game-icon{color:#7f4f24}.action-card span{display:grid;gap:2px}.action-card small{color:#797586}.action-card.exhausted{background:#2f2b3d;border-color:#2f2b3d;color:#fff;cursor:not-allowed;opacity:1}.action-card.exhausted .game-icon,.action-card.exhausted small{color:#d8d5de}@media(max-width:599px){.game-metrics{grid-template-columns:1fr}}
</style>
