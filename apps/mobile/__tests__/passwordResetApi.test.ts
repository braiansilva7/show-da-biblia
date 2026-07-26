jest.mock('../config', () => ({ API_URL: 'http://api.example.test/api/v1' }));

import { authApi } from '../api/authApi';

describe('password reset API', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends the documented recovery payloads and keeps the reset token out of storage', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/verify-code'))
        return new Response(
          JSON.stringify({ reset_token: 'temporary-token', expires_in: '15m' }),
          { status: 200 }
        );
      if (url.endsWith('/reset-password'))
        return new Response(null, { status: 204 });
      return new Response(JSON.stringify({ message: 'Code sent' }), {
        status: 202,
      });
    }) as typeof fetch;

    await authApi.sendPasswordResetCode('maria@example.test');
    const verified = await authApi.verifyPasswordResetCode(
      'maria@example.test',
      '123456'
    );
    await authApi.resetPassword(
      verified.resetToken,
      'new-password',
      'new-password'
    );

    expect(calls).toHaveLength(3);
    expect(calls[0].url).toContain('/auth/forgot-password/send-code');
    expect(calls[0].init?.body).toBe(
      JSON.stringify({ email: 'maria@example.test' })
    );
    expect(calls[2].init?.headers).toMatchObject({
      Authorization: 'Bearer temporary-token',
    });
  });
});
