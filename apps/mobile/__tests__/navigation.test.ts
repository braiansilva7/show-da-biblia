import type { AppTabParamList, RootStackParamList } from '../navigation/types';

describe('navigation contracts', () => {
  it('accepts the result route parameters', () => {
    const route: RootStackParamList['Result'] = { sessionId: 'session-1' };
    expect(route.sessionId).toBe('session-1');
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
