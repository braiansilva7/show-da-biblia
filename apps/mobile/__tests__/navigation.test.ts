import type { AppTabParamList, RootStackParamList } from '../navigation/types';

describe('navigation contracts', () => {
  it('accepts the result route parameters', () => {
    const route: RootStackParamList['Result'] = {
      summary: {
        id: 'session-1',
        status: 'FINISHED',
        endReason: 'COMPLETED',
        score: 30,
        correctAnswers: 30,
        answeredQuestions: 30,
        skipsUsed: 0,
        jokers: [],
        highestUnlockedLevel: 3,
        durationSeconds: 120,
      },
    };
    expect(route.summary.id).toBe('session-1');
  });
  it('declares the password recovery route', () => {
    const route: RootStackParamList['ForgotPassword'] = undefined;
    expect(route).toBeUndefined();
  });
  it('declares the about tab', () => {
    const route: AppTabParamList['About'] = undefined;
    expect(route).toBeUndefined();
  });
});
