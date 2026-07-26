import type { DifficultyLevel } from '@core/common/types/difficulty.js';

export type QuestionLanguage = 'pt-BR' | 'en' | 'es';
export type QuestionTranslationInput = {
  statement?: string;
  explanation?: string;
};
export type AnswerTranslationInput = { content?: string };
export type QuestionTranslationsInput = {
  'pt-BR'?: QuestionTranslationInput;
  en?: QuestionTranslationInput;
  es?: QuestionTranslationInput;
};
export type AnswerTranslationsInput = {
  'pt-BR'?: AnswerTranslationInput;
  en?: AnswerTranslationInput;
  es?: AnswerTranslationInput;
};
export interface IQuestionOptionInput {
  position: 1 | 2 | 3 | 4;
  is_correct: boolean;
  translations: AnswerTranslationsInput;
}
export interface IQuestionMutationInput {
  categoryId: string;
  difficultyLevel: DifficultyLevel;
  translations: QuestionTranslationsInput;
  options: IQuestionOptionInput[];
}
