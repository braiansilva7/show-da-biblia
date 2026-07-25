import type { RootStackParamList } from '../navigation/types';

describe('navigation contracts', () => {
  it('accepts the result route parameters', () => {
    const route: RootStackParamList['Result'] = { sessionId: 'session-1' };
    expect(route.sessionId).toBe('session-1');
  });
});
