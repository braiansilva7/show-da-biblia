import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { LoginScreen } from '../screens/LoginScreen';

const mockLogin = jest.fn();
const mockLoginWithBiometrics = jest.fn();
const mockSession = {
  biometricLoginAvailable: true,
  clearSessionMessage: jest.fn(),
  login: mockLogin,
  loginWithBiometrics: mockLoginWithBiometrics,
  sessionMessage: null,
};

jest.mock('../components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../components/FormField', () => ({
  FormField: () => null,
}));
jest.mock('../context/AppSessionContext', () => ({
  useAppSession: () => mockSession,
}));
jest.mock('../context/LocalizationContext', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));

describe('LoginScreen biometric login', () => {
  const navigation = { navigate: jest.fn() } as never;
  const route = { params: undefined } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.biometricLoginAvailable = true;
    mockLoginWithBiometrics.mockResolvedValue('success');
  });

  it('shows biometric login only when a locked session is available', () => {
    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    expect(screen.getByRole('button', { name: 'biometricLogin' })).toBeTruthy();

    mockSession.biometricLoginAvailable = false;
    screen.rerender(<LoginScreen navigation={navigation} route={route} />);
    expect(
      screen.queryByRole('button', { name: 'biometricLogin' })
    ).toBeNull();
  });

  it('uses the localized biometric prompt when the button is pressed', async () => {
    const screen = render(<LoginScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByRole('button', { name: 'biometricLogin' }));

    await waitFor(() =>
      expect(mockLoginWithBiometrics).toHaveBeenCalledWith('biometricPrompt')
    );
  });
});
