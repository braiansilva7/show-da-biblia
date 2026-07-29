import { request } from '../api/client';
import { authApi } from '../api/authApi';

jest.mock('../api/client', () => ({ request: jest.fn() }));
const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('authApi session mapping', () => {
  it('maps the public best time returned on login', async () => {
    mockedRequest.mockResolvedValueOnce({
      access_token: 'token',
      user: {
        id: 'user-1',
        username: 'Maria',
        email: 'maria@example.test',
        country_id: 'country-1',
        language_code: 'pt-BR',
        profile_picture_url: null,
        total_score: 12,
        best_time_seconds: 127,
      },
    });

    await expect(
      authApi.login('maria@example.test', 'secret')
    ).resolves.toMatchObject({
      user: { bestTimeSeconds: 127, totalScore: 12 },
    });
  });
});
