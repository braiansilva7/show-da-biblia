export type DifficultyLevel = 1 | 2 | 3;
export type DifficultyLevelLabelKey =
  'difficulty_easy' | 'difficulty_medium' | 'difficulty_hard';

export interface DifficultyLevelOption {
  value: DifficultyLevel;
  labelKey: DifficultyLevelLabelKey;
}

export const difficultyLevelOptions: readonly DifficultyLevelOption[] = [
  { value: 1, labelKey: 'difficulty_easy' },
  { value: 2, labelKey: 'difficulty_medium' },
  { value: 3, labelKey: 'difficulty_hard' },
];
