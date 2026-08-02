import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { UserService } from './user.service.js';
import { hashPassword } from '@core/common/functions/password.js';

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

test('requires the current password and increments the session version for an own password change', async () => {
  const current = {
    id: 'administrator-1',
    passwordHash: await hashPassword('current-password'),
  };
  let updateInput: Record<string, unknown> | undefined;
  const repository = {
    findById: async () => current,
    existsByUsername: async () => false,
    update: async (_id: string, input: Record<string, unknown>) => {
      updateInput = input;
      return {};
    },
  };
  const service = new UserService(
    repository as never,
    { deleteByUrl: async () => undefined } as never,
    { existsActiveById: async () => true } as never,
    {} as never
  );

  await assert.rejects(
    () =>
      service.update(
        current.id,
        {
          currentPassword: 'wrong-password',
          password: 'new-password',
          passwordConfirmation: 'new-password',
        },
        current as never
      ),
    { message: 'CURRENT_PASSWORD_INVALID' }
  );

  await service.update(
    current.id,
    {
      currentPassword: 'current-password',
      password: 'new-password',
      passwordConfirmation: 'new-password',
    },
    current as never
  );

  assert.equal(updateInput?.incrementSessionVersion, true);
  assert.equal(typeof updateInput?.passwordHash, 'string');
});
