import type { DifficultyLevel } from '@core/common/types/difficulty.js';
import type { QuestionStatus } from '@core/common/types/question.js';

export interface IListQuestionsInput {
  page: number;
  limit: number;
  language: 'pt-BR' | 'en' | 'es';
  search?: string;
  categoryId?: string;
  difficultyLevel?: DifficultyLevel;
  status?: QuestionStatus;
  author?: string;
  createdFrom?: string;
  createdTo?: string;
}
