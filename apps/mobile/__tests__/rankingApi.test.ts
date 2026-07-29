import { request } from '../api/client';
import { rankingApi } from '../api/rankingApi';

jest.mock('../api/client', () => ({ request: jest.fn() }));
const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('rankingApi', () => {
  it('maps a paginated international ranking including public player details', async () => {
    mockedRequest.mockResolvedValueOnce({
      page: 1,
      page_size: 20,
      total: 21,
      items: [
        {
          position: 1,
          user_id: 'player-1',
          username: 'Maria',
          country_id: 'country-1',
          country_name: 'Brasil',
          profile_picture_url: 'https://images.test/maria.png',
          score: 30,
          correct_answers: 30,
          duration_seconds: 50,
        },
      ],
    });

    await expect(rankingApi.list('international')).resolves.toEqual({
      page: 1,
      pageSize: 20,
      total: 21,
      items: [
        {
          position: 1,
          userId: 'player-1',
          username: 'Maria',
          countryId: 'country-1',
          countryName: 'Brasil',
          profilePictureUrl: 'https://images.test/maria.png',
          score: 30,
          correctAnswers: 30,
          durationSeconds: 50,
        },
      ],
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/rankings/international?page=1&page_size=20'
    );
  });

  it('uses the authenticated-player national endpoint without sending a country filter', async () => {
    mockedRequest.mockResolvedValueOnce({
      page: 2,
      page_size: 20,
      total: 20,
      items: [],
    });

    await rankingApi.list('national', 2);

    expect(mockedRequest).toHaveBeenCalledWith(
      '/rankings/national?page=2&page_size=20'
    );
  });

  it('maps absent positions for a player without a finished game', async () => {
    mockedRequest.mockResolvedValueOnce({
      international: null,
      national: null,
    });

    await expect(rankingApi.mine()).resolves.toEqual({
      international: null,
      national: null,
    });
    expect(mockedRequest).toHaveBeenCalledWith('/rankings/me');
  });
});
