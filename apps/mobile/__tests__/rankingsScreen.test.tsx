import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RankingsScreen } from '../screens/RankingsScreen';
import { rankingService } from '../services/rankingService';

jest.mock('../context/AppSessionContext', () => ({
  useAppSession: () => ({
    user: {
      id: 'me',
      username: 'Me',
      profilePictureUrl: null,
      totalScore: 0,
      bestTimeSeconds: null,
      email: 'me@test.dev',
      countryId: 'br',
      languageCode: 'pt-BR',
    },
  }),
}));
jest.mock('../context/LocalizationContext', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));
jest.mock('../services/rankingService', () => ({
  rankingService: { list: jest.fn(), mine: jest.fn() },
}));

const mockedRankingService = rankingService as jest.Mocked<
  typeof rankingService
>;
const nationalItem = {
  position: 1,
  userId: 'other',
  username: 'Maria',
  countryId: 'br',
  countryName: 'Brasil',
  profilePictureUrl: null,
  score: 30,
  correctAnswers: 30,
  durationSeconds: 50,
};

describe('RankingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRankingService.mine.mockResolvedValue({
      international: null,
      national: {
        position: 42,
        score: 12,
        correctAnswers: 12,
        durationSeconds: 80,
      },
    });
    mockedRankingService.list.mockImplementation(async (scope, page) => ({
      page: page ?? 1,
      pageSize: 20,
      total: scope === 'national' ? 21 : 0,
      items: scope === 'national' && page === 1 ? [nationalItem] : [],
    }));
  });

  it('changes ranking scopes and keeps the authenticated player highlighted outside the loaded page', async () => {
    const screen = render(<RankingsScreen />);

    await waitFor(() => expect(screen.getByText('Maria')).toBeTruthy());
    expect(screen.getByText('#42 · 01:20')).toBeTruthy();
    expect(screen.getByText('#1 · 00:50')).toBeTruthy();
    expect(mockedRankingService.list).toHaveBeenCalledWith('national', 1, 20);

    fireEvent.press(screen.getByRole('tab', { name: 'internationalRanking' }));

    await waitFor(() =>
      expect(mockedRankingService.list).toHaveBeenCalledWith(
        'international',
        1,
        20
      )
    );
    expect(screen.getByText('rankingEmptyTitle')).toBeTruthy();
    expect(screen.getByText('rankingUnranked')).toBeTruthy();
  });

  it('loads the following page when more ranking entries are available', async () => {
    const screen = render(<RankingsScreen />);

    await waitFor(() => expect(screen.getByText('loadMore')).toBeTruthy());
    fireEvent.press(screen.getByText('loadMore'));

    await waitFor(() =>
      expect(mockedRankingService.list).toHaveBeenCalledWith('national', 2, 20)
    );
  });

  it('shows an error and lets the player retry', async () => {
    mockedRankingService.list.mockRejectedValueOnce(new Error('offline'));
    const screen = render(<RankingsScreen />);

    await waitFor(() => expect(screen.getByText('rankingError')).toBeTruthy());
    fireEvent.press(screen.getByText('tryAgain'));
    await waitFor(() =>
      expect(mockedRankingService.list).toHaveBeenCalledTimes(2)
    );
  });
});
