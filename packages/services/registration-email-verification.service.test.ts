import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { RegistrationEmailVerificationService } from './registration-email-verification.service.js';

process.env.REGISTRATION_EMAIL_CODE_SECRET = 'registration-test-secret';

function makeService(options: { userExists?: boolean; failDelivery?: boolean } = {}) {
  let active: { id: string; email: string; codeHash: string; attempts: number; expiresAt: string; createdAt: string } | null = null;
  let deliveredCode = '';
  const codes = {
    findLatestActiveByEmail: async () => active,
    invalidateActiveForEmail: async () => { active = null; },
    create: async (email: string, codeHash: string, expiresAt: string) => {
      active = { id: 'code-1', email, codeHash, attempts: 0, expiresAt, createdAt: new Date().toISOString() };
    },
    incrementAttempts: async () => { if (active) active.attempts += 1; },
    consume: async () => { active = null; },
  };
  const users = { findByEmail: async () => options.userExists ? ({ id: 'user-1' }) : null };
  const email = { sendRegistrationVerificationCode: async ({ code }: { code: string }) => {
    if (options.failDelivery) throw new Error('SMTP unavailable');
    deliveredCode = code;
  } };
  return { service: new RegistrationEmailVerificationService(codes as never, users as never, email as never), active: () => active, deliveredCode: () => deliveredCode };
}

test('sends a hashed registration code and consumes it after successful verification', async () => {
  const fixture = makeService();
  await fixture.service.sendCode(' Maria@Example.test ', 'pt-BR', '127.0.0.1');
  assert.match(fixture.deliveredCode(), /^\d{6}$/);
  assert.notEqual(fixture.active()?.codeHash, fixture.deliveredCode());
  assert.equal(await fixture.service.verifyCode('maria@example.test', fixture.deliveredCode()), 'maria@example.test');
  assert.equal(fixture.active(), null);
});

test('rejects existing addresses, invalid attempts, resend bursts, and SMTP failures', async () => {
  const existing = makeService({ userExists: true });
  await assert.rejects(() => existing.service.sendCode('maria@example.test', 'pt-BR', 'origin'), /REGISTRATION_EMAIL_ALREADY_EXISTS/);

  const fixture = makeService();
  await fixture.service.sendCode('maria@example.test', 'pt-BR', 'origin');
  await assert.rejects(() => fixture.service.verifyCode('maria@example.test', '000000'), /REGISTRATION_CODE_INVALID/);
  await assert.rejects(() => fixture.service.sendCode('maria@example.test', 'pt-BR', 'origin'), /REGISTRATION_CODE_RESEND_TOO_SOON/);

  const exhausted = makeService();
  await exhausted.service.sendCode('ana@example.test', 'pt-BR', 'new-origin');
  for (let attempt = 0; attempt < 5; attempt += 1)
    await assert.rejects(() => exhausted.service.verifyCode('ana@example.test', '000000'), /REGISTRATION_CODE_INVALID/);
  await assert.rejects(() => exhausted.service.verifyCode('ana@example.test', '000000'), /REGISTRATION_CODE_TOO_MANY_ATTEMPTS/);

  const failed = makeService({ failDelivery: true });
  await assert.rejects(() => failed.service.sendCode('maria@example.test', 'pt-BR', 'other-origin'), /SMTP unavailable/);
  assert.equal(failed.active(), null);
});
