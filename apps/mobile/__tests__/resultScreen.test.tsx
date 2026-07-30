import { render } from '@testing-library/react-native';
import { ResultScreen } from '../screens/ResultScreen';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));
jest.mock('../context/AppSessionContext', () => ({
  useAppSession: () => ({ refreshUser: jest.fn() }),
}));
jest.mock('../context/LocalizationContext', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));

function renderResult(overrides: Record<string, unknown> = {}) {
  return render(
    <ResultScreen
      navigation={{ navigate: jest.fn() } as never}
      route={
        {
          params: {
            summary: {
              id: 'session-1',
              status: 'FINISHED',
              endReason: 'WRONG_ANSWER',
              score: 7,
              correctAnswers: 7,
              answeredQuestions: 9,
              skipsUsed: 1,
              jokers: [
                { code: 'REVEAL_ANSWER', quantityUsed: 1 },
                { code: 'ELIMINATE_1', quantityUsed: 0 },
              ],
              highestUnlockedLevel: 2,
              durationSeconds: 127,
              ...overrides,
            },
          },
        } as never
      }
    />
  );
}

describe('ResultScreen', () => {
  it('presents the game result in metric cards and item details', () => {
    const screen = renderResult();

    expect(screen.getByText('7/30')).toBeTruthy();
    expect(screen.getByText('02:07')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('jokerReveal')).toBeTruthy();
  });

  it('shows an empty state when no cards or skips were used', () => {
    const screen = renderResult({
      skipsUsed: 0,
      jokers: [{ code: 'ELIMINATE_1', quantityUsed: 0 }],
    });

    expect(screen.getByText('noItemsUsed')).toBeTruthy();
  });

  it('celebrates when the player completes all levels with every answer correct', () => {
    const screen = renderResult({
      endReason: 'COMPLETED',
      score: 30,
      correctAnswers: 30,
      answeredQuestions: 30,
      highestUnlockedLevel: 3,
    });

    expect(screen.getByText('challengeVictoryBadge')).toBeTruthy();
    expect(screen.getByText('challengeVictoryTitle')).toBeTruthy();
    expect(screen.getByText('challengeVictoryDescription')).toBeTruthy();
    expect(screen.queryByText('resultDescription')).toBeNull();
    expect(screen.getByText('30/30')).toBeTruthy();
  });

  it('does not celebrate an incomplete result even if level 3 was unlocked', () => {
    const screen = renderResult({
      endReason: 'WRONG_ANSWER',
      correctAnswers: 29,
      highestUnlockedLevel: 3,
    });

    expect(screen.getByText('resultTitle')).toBeTruthy();
    expect(screen.queryByText('challengeVictoryTitle')).toBeNull();
  });
});
