import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { UserService } from './user.service.js';

const administrator = { id: 'administrator-1' };

function createService(
  result: { deleted: boolean; profilePictureUrl: string | null },
  storageFails = false
) {
  const calls: string[] = [];
  const repository = {
    deleteWithDependencies: async (id: string, executorId: string) => {
      calls.push(`delete:${id}:${executorId}`);
      return result;
    },
  };
  const storage = {
    deleteByUrl: async (url: string | null) => {
      calls.push(`storage:${url}`);
      if (storageFails) throw new Error('storage unavailable');
    },
  };
  return {
    service: new UserService(repository as never, storage as never, {} as never, {} as never),
    calls,
  };
}

test('deletes a user through the transactional repository before deleting the profile image', async () => {
  const fixture = createService({ deleted: true, profilePictureUrl: 'https://cdn.example.test/avatar.png' });

  await assert.deepEqual(
    await fixture.service.delete('player-1', administrator as never),
    { deleted: true }
  );
  assert.deepEqual(fixture.calls, [
    'delete:player-1:administrator-1',
    'storage:https://cdn.example.test/avatar.png',
  ]);
});

test('does not delete storage when the user does not exist or when self-deletion is attempted', async () => {
  const missing = createService({ deleted: false, profilePictureUrl: null });
  await assert.deepEqual(
    await missing.service.delete('missing-user', administrator as never),
    { deleted: false }
  );
  assert.deepEqual(missing.calls, ['delete:missing-user:administrator-1']);

  const self = createService({ deleted: true, profilePictureUrl: 'https://cdn.example.test/avatar.png' });
  await assert.deepEqual(
    await self.service.delete('administrator-1', administrator as never),
    { error: 'SELF_DELETE' }
  );
  assert.deepEqual(self.calls, []);
});

test('keeps the successful deletion when profile image removal fails after commit', async () => {
  const fixture = createService(
    { deleted: true, profilePictureUrl: 'https://cdn.example.test/avatar.png' },
    true
  );

  await assert.deepEqual(
    await fixture.service.delete('player-1', administrator as never),
    { deleted: true }
  );
  assert.deepEqual(fixture.calls, [
    'delete:player-1:administrator-1',
    'storage:https://cdn.example.test/avatar.png',
  ]);
});
