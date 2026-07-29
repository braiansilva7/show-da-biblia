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

  it('requests and verifies an email before public registration', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/verify-email-code'))
        return new Response(
          JSON.stringify({
            registration_token: 'email-token',
            expires_in: '15m',
          }),
          { status: 200 }
        );
      return new Response(JSON.stringify({ message: 'Code sent' }), {
        status: 202,
      });
    }) as typeof fetch;

    await authApi.requestRegistrationEmailCode('maria@example.test', 'pt-BR');
    const verified = await authApi.verifyRegistrationEmailCode(
      'maria@example.test',
      '123456'
    );

    expect(verified.registrationToken).toBe('email-token');
    expect(calls[0].url).toContain('/auth/register/request-email-code');
    expect(calls[0].init?.body).toBe(
      JSON.stringify({ email: 'maria@example.test', language_code: 'pt-BR' })
    );
    expect(calls[1].url).toContain('/auth/register/verify-email-code');
  });

  it('sends the verified-email token when completing registration', async () => {
    let registrationRequest: RequestInit | undefined;
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      registrationRequest = init;
      return new Response(
        JSON.stringify({
          access_token: 'session-token',
          user: {
            id: '019f9752-0000-7000-8000-000000000001',
            username: 'maria',
            email: 'maria@example.test',
            country_id: '019f9749-5b00-7000-8000-000000000019',
            language_code: 'pt-BR',
            profile_picture_url: null,
            total_score: 0,
            best_time_seconds: null,
          },
        }),
        { status: 201 }
      );
    }) as typeof fetch;

    await authApi.register(
      {
        username: 'maria',
        email: 'maria@example.test',
        password: 'safe-password',
        countryId: '019f9749-5b00-7000-8000-000000000019',
        languageCode: 'pt-BR',
      },
      'verified-email-token'
    );

    expect(registrationRequest?.headers).toMatchObject({
      Authorization: 'Bearer verified-email-token',
    });
  });

  it('checks username availability with the public registration endpoint', async () => {
    let requestInit: RequestInit | undefined;
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      requestInit = init;
      return new Response(JSON.stringify({ available: true }), { status: 200 });
    }) as typeof fetch;

    await expect(authApi.checkUsernameAvailability('maria')).resolves.toBe(
      true
    );
    expect(requestInit?.body).toBe(JSON.stringify({ username: 'maria' }));
  });
});
