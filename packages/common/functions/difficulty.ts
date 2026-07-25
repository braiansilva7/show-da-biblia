import { EDifficultyLevel } from '@core/common/enums/EDifficultyLevel.js';
import type {
  DifficultyLevel,
  DifficultyLevelLabelKey,
  DifficultyLevelOption,
} from '@core/common/types/difficulty.js';

const difficultyLevelOptions: readonly DifficultyLevelOption[] = [
  { value: EDifficultyLevel.easy, labelKey: 'difficulty_easy' },
  { value: EDifficultyLevel.medium, labelKey: 'difficulty_medium' },
  { value: EDifficultyLevel.hard, labelKey: 'difficulty_hard' },
];

const difficultyLevelLabelKeys: Readonly<
  Record<DifficultyLevel, DifficultyLevelLabelKey>
> = {
  [EDifficultyLevel.easy]: 'difficulty_easy',
  [EDifficultyLevel.medium]: 'difficulty_medium',
  [EDifficultyLevel.hard]: 'difficulty_hard',
};

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return (
    value === EDifficultyLevel.easy ||
    value === EDifficultyLevel.medium ||
    value === EDifficultyLevel.hard
  );
}

export function getDifficultyLevelLabelKey(
  value: DifficultyLevel
): DifficultyLevelLabelKey {
  if (!isDifficultyLevel(value))
    throw new RangeError('INVALID_DIFFICULTY_LEVEL');
  return difficultyLevelLabelKeys[value];
}

export function getDifficultyLevelOptions(): DifficultyLevelOption[] {
  return difficultyLevelOptions.map((option) => ({ ...option }));
}
