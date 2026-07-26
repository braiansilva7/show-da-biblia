import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { PasswordResetService } from './password-reset.service.js';

process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASSWORD = 'test';
process.env.SMTP_FROM = 'Test <test@example.test>';
process.env.PASSWORD_RESET_CODE_SECRET = 'password-reset-test-secret';

const player = {
  id: 'user-1',
  email: 'maria@example.test',
  active: true,
  languageCode: 'pt-BR',
  sessionVersion: 1,
} as const;

test('creates a hashed one-time code, consumes it and invalidates older codes after password reset', async () => {
  let active: {
    id: string;
    userId: string;
    codeHash: string;
    attempts: number;
    expiresAt: string;
    createdAt: string;
  } | null = null;
  let deliveredCode = '';
  let invalidations = 0;
  const codes = {
    findLatestActiveByUserId: async () => active,
    invalidateActiveForUser: async () => {
      active = null;
      invalidations += 1;
    },
    create: async (userId: string, codeHash: string, expiresAt: string) => {
      active = {
        id: 'code-1',
        userId,
        codeHash,
        attempts: 0,
        expiresAt,
        createdAt: new Date().toISOString(),
      };
    },
    incrementAttempts: async () => {
      if (active) active.attempts += 1;
    },
    consume: async () => {
      active = null;
    },
  };
  const users = {
    findByEmail: async () => player,
    resetPassword: async () => ({ ...player, sessionVersion: 2 }),
  };
  const email = {
    sendPasswordResetCode: async ({ code }: { code: string }) => {
      deliveredCode = code;
    },
  };
  const service = new PasswordResetService(
    codes as never,
    users as never,
    email as never
  );

  await service.sendCode(player.email, '127.0.0.1');
  assert.match(deliveredCode, /^\d{6}$/);
  const stored = active as { codeHash: string } | null;
  assert.notEqual(stored?.codeHash, deliveredCode);
  const verified = await service.verifyCode(player.email, deliveredCode);
  assert.equal(verified.id, player.id);
  await assert.rejects(() => service.verifyCode(player.email, deliveredCode));
  await service.resetPassword(player.id, 'new-password');
  assert.ok(invalidations >= 2);
});

test('rejects an expired recovery code', async () => {
  const active = {
    id: 'code-1',
    userId: player.id,
    codeHash: 'a'.repeat(64),
    attempts: 0,
    expiresAt: new Date(Date.now() - 1).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const service = new PasswordResetService(
    { findLatestActiveByUserId: async () => active } as never,
    { findByEmail: async () => player } as never,
    {} as never
  );
  await assert.rejects(
    () => service.verifyCode(player.email, '123456'),
    /RESET_CODE_EXPIRED/
  );
});

test('blocks verification after the attempt limit and discards a code when SMTP fails', async () => {
  const exhausted = {
    id: 'code-1',
    userId: player.id,
    codeHash: 'a'.repeat(64),
    attempts: 5,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const verification = new PasswordResetService(
    { findLatestActiveByUserId: async () => exhausted } as never,
    { findByEmail: async () => player } as never,
    {} as never
  );
  await assert.rejects(
    () => verification.verifyCode(player.email, '123456'),
    /RESET_CODE_TOO_MANY_ATTEMPTS/
  );

  let invalidations = 0;
  const delivery = new PasswordResetService(
    {
      findLatestActiveByUserId: async () => null,
      invalidateActiveForUser: async () => {
        invalidations += 1;
      },
      create: async () => undefined,
    } as never,
    { findByEmail: async () => player } as never,
    {
      sendPasswordResetCode: async () => {
        throw new Error('SMTP unavailable');
      },
    } as never
  );
  await assert.rejects(() => delivery.sendCode(player.email, '127.0.0.1'));
  assert.equal(invalidations, 2);
});
