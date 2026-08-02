import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { QuestionRepository } from './question.repository.js';

function createRepository(usage: number, failWhileCheckingUsage = false) {
  const calls: string[] = [];
  let rolledBack = false;
  let executeCalls = 0;
  const tx = {
    execute: async () => {
      executeCalls += 1;
      if (executeCalls === 1) {
        calls.push('lock-question');
        return { rows: [{ id: 'question-1' }] };
      }
      calls.push('check-usage');
      if (failWhileCheckingUsage) throw new Error('database failed');
      return { rows: [{ total: usage }] };
    },
    update: () => ({
      set: () => ({
        where: async () => calls.push('archive'),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: async () => {
          calls.push('delete');
          return [{ id: 'question-1' }];
        },
      }),
    }),
  };
  const db = {
    transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => {
      calls.push('begin');
      try {
        const result = await callback(tx);
        calls.push('commit');
        return result;
      } catch (error) {
        rolledBack = true;
        calls.push('rollback');
        throw error;
      }
    },
  };
  return {
    repository: new QuestionRepository(db as never),
    calls,
    rolledBack: () => rolledBack,
  };
}

test('deletes an unused question within one transaction', async () => {
  const fixture = createRepository(0);

  assert.equal(await fixture.repository.remove('question-1'), 'deleted');
  assert.deepEqual(fixture.calls, [
    'begin',
    'lock-question',
    'check-usage',
    'delete',
    'commit',
  ]);
});

test('archives a question used in a game and preserves its game records', async () => {
  const fixture = createRepository(1);

  assert.equal(await fixture.repository.remove('question-1'), 'archived');
  assert.deepEqual(fixture.calls, [
    'begin',
    'lock-question',
    'check-usage',
    'archive',
    'commit',
  ]);
});

test('rolls back the removal transaction when checking usage fails', async () => {
  const fixture = createRepository(0, true);

  await assert.rejects(fixture.repository.remove('question-1'), /database failed/);
  assert.equal(fixture.rolledBack(), true);
  assert.deepEqual(fixture.calls, [
    'begin',
    'lock-question',
    'check-usage',
    'rollback',
  ]);
});
