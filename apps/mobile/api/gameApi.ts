import { request } from './client';
import type {
  AnswerResult,
  AnswerFeedback,
  GameQuestion,
  GameSession,
  GameStart,
  GameSummary,
  Joker,
  JokerCode,
  JokerEffect,
  TimeoutResult,
} from '../types/game';

type ApiSession = {
  id: string;
  status: GameSession['status'];
  score: number;
  skips_remaining: number;
  current_level: 1 | 2 | 3;
};
type ApiQuestion = {
  session_question_id: string;
  order_number: number;
  difficulty_level: 1 | 2 | 3;
  presented_at: string;
  statement: string;
  answers: GameQuestion['answers'];
};
type ApiJoker = {
  code: JokerCode;
  quantity_available: number;
  quantity_used?: number;
};
type ApiSummary = {
  id: string;
  status: 'FINISHED';
  end_reason: GameSummary['endReason'];
  score: number;
  correct_answers: number;
  answered_questions: number;
  skips_used: number;
  jokers: Array<ApiJoker & { quantity_used: number }>;
  highest_unlocked_level: 1 | 2 | 3;
  duration_seconds: number | null;
};
type ApiAnswerFeedback = {
  correct_answer_option_id: string;
  explanation: string;
};

const session = (value: ApiSession): GameSession => ({
  id: value.id,
  status: value.status,
  score: value.score,
  skipsRemaining: value.skips_remaining,
  currentLevel: value.current_level,
});
const question = (value: ApiQuestion): GameQuestion => ({
  sessionQuestionId: value.session_question_id,
  orderNumber: value.order_number,
  difficultyLevel: value.difficulty_level,
  presentedAt: value.presented_at,
  statement: value.statement,
  answers: value.answers,
});
const joker = (value: ApiJoker): Joker => ({
  code: value.code,
  quantityAvailable: value.quantity_available,
});
const summary = (value: ApiSummary): GameSummary => ({
  id: value.id,
  status: value.status,
  endReason: value.end_reason,
  score: value.score,
  correctAnswers: value.correct_answers,
  answeredQuestions: value.answered_questions,
  skipsUsed: value.skips_used,
  jokers: value.jokers.map((item) => ({
    code: item.code,
    quantityUsed: item.quantity_used,
  })),
  highestUnlockedLevel: value.highest_unlocked_level,
  durationSeconds: value.duration_seconds,
});
const feedback = (value: ApiAnswerFeedback): AnswerFeedback => ({
  correctAnswerOptionId: value.correct_answer_option_id,
  explanation: value.explanation,
});

export const gameApi = {
  async start(): Promise<GameStart> {
    const response = await request<{
      session: ApiSession;
      question: ApiQuestion;
      jokers: ApiJoker[];
    }>('/game-sessions', { method: 'POST' });
    return {
      session: session(response.session),
      question: question(response.question),
      jokers: response.jokers.map(joker),
    };
  },
  async answer(sessionId: string, sessionQuestionId: string, answerOptionId: string): Promise<AnswerResult> {
    const response = await request<
      | { finished: true; summary: ApiSummary; feedback: ApiAnswerFeedback }
      | { finished: false; session: ApiSession; question: ApiQuestion; feedback: ApiAnswerFeedback }
    >(`/game-sessions/${sessionId}/answers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_question_id: sessionQuestionId, answer_option_id: answerOptionId }),
    });
    return response.finished
      ? { finished: true, summary: summary(response.summary), feedback: feedback(response.feedback) }
      : {
          finished: false,
          session: session(response.session),
          question: question(response.question),
          feedback: feedback(response.feedback),
        };
  },
  async skip(sessionId: string, sessionQuestionId: string) {
    const response = await request<{ session: ApiSession; question: ApiQuestion }>(
      `/game-sessions/${sessionId}/skip`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_question_id: sessionQuestionId }),
      }
    );
    return { session: session(response.session), question: question(response.question) };
  },
  async useJoker(sessionId: string, sessionQuestionId: string, code: JokerCode): Promise<JokerEffect> {
    const response = await request<{
      session_joker: { joker_type_code: JokerCode; quantity_available: number };
      effect: { eliminated_answer_option_ids: string[]; revealed_answer_option_id?: string };
    }>(`/game-sessions/${sessionId}/jokers/use`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_question_id: sessionQuestionId, joker_type_code: code }),
    });
    return {
      joker: { code: response.session_joker.joker_type_code, quantityAvailable: response.session_joker.quantity_available },
      eliminatedOptionIds: response.effect.eliminated_answer_option_ids,
      revealedOptionId: response.effect.revealed_answer_option_id,
    };
  },
  async finish(sessionId: string): Promise<TimeoutResult> {
    const response = await request<{ summary: ApiSummary; feedback: ApiAnswerFeedback }>(
      `/game-sessions/${sessionId}/finish`,
      { method: 'POST' }
    );
    return { summary: summary(response.summary), feedback: feedback(response.feedback) };
  },
  async abandon(sessionId: string): Promise<void> {
    await request<void>(`/game-sessions/${sessionId}/abandon`, { method: 'POST' });
  },
};
