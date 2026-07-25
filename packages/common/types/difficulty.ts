import { EDifficultyLevel } from '@core/common/enums/EDifficultyLevel.js';

export type DifficultyLevel = EDifficultyLevel;
export type DifficultyLevelLabelKey =
  'difficulty_easy' | 'difficulty_medium' | 'difficulty_hard';

export interface DifficultyLevelOption {
  value: DifficultyLevel;
  labelKey: DifficultyLevelLabelKey;
}
