import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { authApi } from '../api/authApi';
import {
  AppSessionProvider,
  useAppSession,
} from '../context/AppSessionContext';
import { LocalizationProvider } from '../context/LocalizationContext';
import { authStorage } from '../storage/authStorage';
import { authenticateWithBiometrics } from '../services/biometricAuthentication';

const session = {
  accessToken: 'session-token',
  user: {
    id: 'user-1',
    username: 'Maria',
    email: 'maria@example.test',
    countryId: 'country-1',
    languageCode: 'pt-BR' as const,
    profilePictureUrl: null,
    totalScore: 0,
    bestTimeSeconds: null,
  },
};

jest.mock('../api/authApi', () => ({
  authApi: { me: jest.fn(), login: jest.fn(), register: jest.fn(), updateProfile: jest.fn() },
}));
jest.mock('../storage/authStorage', () => ({
  authStorage: {
    clear: jest.fn(),
    isBiometricLoginEnabled: jest.fn(),
    read: jest.fn(),
    save: jest.fn(),
    setBiometricLoginEnabled: jest.fn(),
  },
}));
jest.mock('../services/biometricAuthentication', () => ({
  authenticateWithBiometrics: jest.fn(),
  isBiometricAuthenticationAvailable: jest.fn(),
}));

function SessionProbe() {
  const { biometricLoginAvailable, booting, login, loginWithBiometrics, user } =
    useAppSession();
  return (
    <>
      <Text>{booting ? 'booting' : 'ready'}</Text>
      <Text>{user?.id ?? 'anonymous'}</Text>
      <Text>{biometricLoginAvailable ? 'biometric-ready' : 'biometric-off'}</Text>
      <Pressable onPress={() => void loginWithBiometrics('Confirm identity')}>
        <Text>unlock</Text>
      </Pressable>
      <Pressable onPress={() => void login('maria@example.test', 'password')}>
        <Text>password-login</Text>
      </Pressable>
    </>
  );
}

describe('AppSessionProvider biometric login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authStorage.read as jest.Mock).mockResolvedValue(session);
    (authStorage.save as jest.Mock).mockResolvedValue(undefined);
    (authStorage.isBiometricLoginEnabled as jest.Mock).mockResolvedValue(true);
  });

  it('requests biometrics on reopening and validates the saved session before unlocking it', async () => {
    const {
      isBiometricAuthenticationAvailable,
    } = jest.requireMock('../services/biometricAuthentication') as {
      isBiometricAuthenticationAvailable: jest.Mock;
    };
    isBiometricAuthenticationAvailable.mockResolvedValue(true);
    (authenticateWithBiometrics as jest.Mock).mockResolvedValue('success');
    (authApi.me as jest.Mock).mockResolvedValue({ ...session.user, username: 'Maria Updated' });

    const screen = render(
      <LocalizationProvider>
        <AppSessionProvider>
          <SessionProbe />
        </AppSessionProvider>
      </LocalizationProvider>
    );

    await waitFor(() => expect(screen.getByText('user-1')).toBeTruthy());
    expect(screen.getByText('ready')).toBeTruthy();
    expect(screen.getByText('biometric-ready')).toBeTruthy();
    expect(authenticateWithBiometrics).toHaveBeenCalledWith(
      'Confirme sua identidade para entrar.'
    );
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(authStorage.save).toHaveBeenCalledWith({
      accessToken: 'session-token',
      user: expect.objectContaining({ username: 'Maria Updated' }),
    });
  });

  it('keeps the session locked when the automatic biometric request is cancelled', async () => {
    const {
      isBiometricAuthenticationAvailable,
    } = jest.requireMock('../services/biometricAuthentication') as {
      isBiometricAuthenticationAvailable: jest.Mock;
    };
    isBiometricAuthenticationAvailable.mockResolvedValue(true);
    (authenticateWithBiometrics as jest.Mock).mockResolvedValue('cancelled');

    const screen = render(
      <LocalizationProvider>
        <AppSessionProvider>
          <SessionProbe />
        </AppSessionProvider>
      </LocalizationProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(screen.getByText('anonymous')).toBeTruthy();
    expect(screen.getByText('biometric-ready')).toBeTruthy();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it('preserves the biometric preference after a password login', async () => {
    const {
      isBiometricAuthenticationAvailable,
    } = jest.requireMock('../services/biometricAuthentication') as {
      isBiometricAuthenticationAvailable: jest.Mock;
    };
    (authStorage.read as jest.Mock).mockResolvedValue(null);
    isBiometricAuthenticationAvailable.mockResolvedValue(true);
    (authApi.login as jest.Mock).mockResolvedValue(session);

    const screen = render(
      <LocalizationProvider>
        <AppSessionProvider>
          <SessionProbe />
        </AppSessionProvider>
      </LocalizationProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    fireEvent.press(screen.getByText('password-login'));

    await waitFor(() => expect(screen.getByText('user-1')).toBeTruthy());
    expect(screen.getByText('biometric-ready')).toBeTruthy();
    expect(authStorage.save).toHaveBeenCalledWith(session);
  });
});
