import { gameApi } from '../api/gameApi';
import type {
  AnswerResult,
  GameQuestion,
  GameSession,
  GameStart,
  GameSummary,
  TimeoutResult,
  JokerCode,
  JokerEffect,
} from '../types/game';

export interface GameSessionService {
  start(): Promise<GameStart>;
  answer(sessionId: string, sessionQuestionId: string, answerOptionId: string): Promise<AnswerResult>;
  skip(sessionId: string, sessionQuestionId: string): Promise<{ session: GameSession; question: GameQuestion }>;
  useJoker(sessionId: string, sessionQuestionId: string, code: JokerCode): Promise<JokerEffect>;
  finish(sessionId: string): Promise<TimeoutResult>;
  abandon(sessionId: string): Promise<void>;
}

/** The API-backed implementation belongs to the gameplay integration milestone. */
export const gameSessionService: GameSessionService = {
  start: () => gameApi.start(),
  answer: (sessionId, sessionQuestionId, answerOptionId) => gameApi.answer(sessionId, sessionQuestionId, answerOptionId),
  skip: (sessionId, sessionQuestionId) => gameApi.skip(sessionId, sessionQuestionId),
  useJoker: (sessionId, sessionQuestionId, code) => gameApi.useJoker(sessionId, sessionQuestionId, code),
  finish: (sessionId) => gameApi.finish(sessionId),
  abandon: (sessionId) => gameApi.abandon(sessionId),
};
