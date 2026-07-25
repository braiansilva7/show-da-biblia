import assert from 'node:assert/strict';
import test from 'node:test';
import { EDifficultyLevel } from '@core/common/enums/EDifficultyLevel.js';
import {
  getDifficultyLevelLabelKey,
  getDifficultyLevelOptions,
  isDifficultyLevel,
} from '@core/common/functions/difficulty.js';

test('accepts only the three fixed difficulty levels', () => {
  assert.equal(isDifficultyLevel(EDifficultyLevel.easy), true);
  assert.equal(isDifficultyLevel(EDifficultyLevel.medium), true);
  assert.equal(isDifficultyLevel(EDifficultyLevel.hard), true);
  assert.equal(isDifficultyLevel(0), false);
  assert.equal(isDifficultyLevel(4), false);
  assert.equal(isDifficultyLevel('1'), false);
  assert.equal(isDifficultyLevel(null), false);
});

test('provides stable presentation keys and ordered options', () => {
  assert.equal(
    getDifficultyLevelLabelKey(EDifficultyLevel.easy),
    'difficulty_easy'
  );
  assert.equal(
    getDifficultyLevelLabelKey(EDifficultyLevel.medium),
    'difficulty_medium'
  );
  assert.equal(
    getDifficultyLevelLabelKey(EDifficultyLevel.hard),
    'difficulty_hard'
  );
  assert.deepEqual(getDifficultyLevelOptions(), [
    { value: EDifficultyLevel.easy, labelKey: 'difficulty_easy' },
    { value: EDifficultyLevel.medium, labelKey: 'difficulty_medium' },
    { value: EDifficultyLevel.hard, labelKey: 'difficulty_hard' },
  ]);
  assert.throws(
    () => getDifficultyLevelLabelKey(4 as EDifficultyLevel),
    /INVALID_DIFFICULTY_LEVEL/
  );
});
