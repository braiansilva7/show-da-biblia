import {
  GAME_CORRECT_ANSWERS_PER_LEVEL,
  GAME_MAX_CORRECT_ANSWERS,
} from '../constants/app';

export function getCurrentQuestionInLevel(score: number): number {
  if (!Number.isFinite(score)) return 1;

  const normalizedScore = Math.min(
    Math.max(0, Math.trunc(score)),
    GAME_MAX_CORRECT_ANSWERS - 1
  );

  return (normalizedScore % GAME_CORRECT_ANSWERS_PER_LEVEL) + 1;
}
