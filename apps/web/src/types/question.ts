import type { DifficultyLevel } from '@/types/difficulty';

export type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface QuestionFilters {
  search: string;
  category_id: string;
  difficulty_level: DifficultyLevel | null;
  status: QuestionStatus | null;
  author: string;
  created_from: string;
  created_to: string;
}

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

export interface QuestionCategoryFilter {
  id: string;
  name: string;
}

export interface QuestionsListResponse {
  questions: QuestionListItem[];
  total: number;
  page: number;
  limit: number;
  categories: QuestionCategoryFilter[];
}

export type QuestionLanguage = 'pt-BR' | 'en' | 'es';
export interface QuestionTranslationInput { statement: string; explanation: string }
export interface AnswerTranslationInput { content: string }
export interface QuestionOptionInput {
  position: 1 | 2 | 3 | 4 | 5;
  is_correct: boolean;
  translations: Record<QuestionLanguage, AnswerTranslationInput>;
}
export interface QuestionFormInput {
  category_id: string;
  difficulty_level: DifficultyLevel;
  translations: Record<QuestionLanguage, QuestionTranslationInput>;
  options: QuestionOptionInput[];
}
export interface EditableQuestion extends QuestionFormInput {
  id: string;
  status: QuestionStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  options: Array<QuestionOptionInput & { id: string }>;
}
