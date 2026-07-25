import type { DifficultyLevel } from '@core/common/types/difficulty.js';

export const questionStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type QuestionStatus = (typeof questionStatuses)[number];

export interface QuestionListItem {
  id: string;
  statement_preview: string | null;
  statement_language: string | null;
  category: { id: string; name: string };
  difficulty_level: DifficultyLevel;
  status: QuestionStatus;
  languages: string[];
  author: { id: string; username: string; email: string };
  created_at: string;
  updated_at: string;
  published_at: string | null;
  answer_options_count: number;
  correct_answers_count: number;
  is_complete: boolean;
}

export interface QuestionFilterCategory {
  id: string;
  name: string;
}
