import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { authApi } from '../api/authApi';
import { authStorage } from '../storage/authStorage';
import type {
  AuthSession,
  MobileUser,
  RegisterInput,
  UpdateProfileInput,
} from '../types/auth';
import { subscribeToSessionExpiration } from '../utils/authEvents';
import {
  authenticateWithBiometrics,
  isBiometricAuthenticationAvailable,
  type BiometricAuthenticationResult,
} from '../services/biometricAuthentication';
import { translate } from '../locales';
import { useLocalization } from './LocalizationContext';

type AppSessionValue = {
  booting: boolean;
  user: MobileUser | null;
  sessionMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  biometricLoginAvailable: boolean;
  biometricLoginEnabled: boolean;
  biometricLoginSupported: boolean;
  enableBiometricLogin: (
    promptMessage: string
  ) => Promise<BiometricAuthenticationResult>;
  disableBiometricLogin: () => Promise<void>;
  loginWithBiometrics: (
    promptMessage: string
  ) => Promise<BiometricAuthenticationResult>;
  register: (input: RegisterInput, registrationToken: string) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionMessage: () => void;
  refreshUser: () => Promise<void>;
};
const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({ children }: PropsWithChildren) {
  const { setLocale, t } = useLocalization();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [biometricLoginAvailable, setBiometricLoginAvailable] =
    useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);
  const [biometricLoginSupported, setBiometricLoginSupported] =
    useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const biometricLoginEnabledRef = useRef(false);
  const userRef = useRef<MobileUser | null>(null);
  const shouldUnlockOnActiveRef = useRef(false);
  const bootStartedRef = useRef(false);
  const accept = useCallback(
    async (session: AuthSession) => {
      await authStorage.save(session);
      const [supported, enabled] = await Promise.all([
        isBiometricAuthenticationAvailable(),
        authStorage.isBiometricLoginEnabled(),
      ]);
      setBiometricLoginSupported(supported);
      setBiometricLoginEnabled(enabled);
      setBiometricLoginAvailable(supported && enabled);
      setUser(session.user);
      setLocale(session.user.languageCode);
    },
    [setLocale]
  );
  const logout = useCallback(async () => {
    await authStorage.clear();
    shouldUnlockOnActiveRef.current = false;
    setBiometricLoginEnabled(false);
    setBiometricLoginSupported(false);
    setBiometricLoginAvailable(false);
    setUser(null);
  }, []);
  const enableBiometricLogin = useCallback(
    async (promptMessage: string): Promise<BiometricAuthenticationResult> => {
      if (!biometricLoginSupported) return 'failed';
      const authentication = await authenticateWithBiometrics(promptMessage);
      if (authentication !== 'success') return authentication;
      await authStorage.setBiometricLoginEnabled(true);
      setBiometricLoginEnabled(true);
      setBiometricLoginAvailable(true);
      return 'success';
    },
    [biometricLoginSupported]
  );
  const disableBiometricLogin = useCallback(async () => {
    await authStorage.setBiometricLoginEnabled(false);
    setBiometricLoginEnabled(false);
    setBiometricLoginAvailable(false);
  }, []);
  const loginWithBiometrics = useCallback(
    async (promptMessage: string): Promise<BiometricAuthenticationResult> => {
      const authentication = await authenticateWithBiometrics(promptMessage);
      if (authentication !== 'success') return authentication;
      const stored = await authStorage.read();
      if (!stored) {
        setBiometricLoginAvailable(false);
        return 'failed';
      }
      try {
        const recovered = await authApi.me();
        await authStorage.save({
          accessToken: stored.accessToken,
          user: recovered,
        });
        setUser(recovered);
        setLocale(recovered.languageCode);
        return 'success';
      } catch {
        if (!(await authStorage.read())) setBiometricLoginAvailable(false);
        return 'failed';
      }
    },
    [setLocale]
  );
  useEffect(() => {
    biometricLoginEnabledRef.current = biometricLoginEnabled;
  }, [biometricLoginEnabled]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const refreshUser = useCallback(async () => {
    const recovered = await authApi.me();
    const stored = await authStorage.read();
    if (stored)
      await authStorage.save({ accessToken: stored.accessToken, user: recovered });
    setUser(recovered);
    setLocale(recovered.languageCode);
  }, [setLocale]);
  useEffect(() => {
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
    void (async () => {
      const stored = await authStorage.read();
      if (stored) {
        setLocale(stored.user.languageCode);
        const [supported, enabled] = await Promise.all([
          isBiometricAuthenticationAvailable(),
          authStorage.isBiometricLoginEnabled(),
        ]);
        setBiometricLoginSupported(supported);
        setBiometricLoginEnabled(enabled);
        setBiometricLoginAvailable(supported && enabled);
        if (supported && enabled) {
          await loginWithBiometrics(
            translate(stored.user.languageCode, 'biometricPrompt')
          );
        }
      }
      setBooting(false);
    })();
    return subscribeToSessionExpiration(() => {
      setUser(null);
      setSessionMessage('expired');
    });
  }, [loginWithBiometrics, setLocale, t]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        (nextState === 'inactive' || nextState === 'background') &&
        biometricLoginEnabledRef.current &&
        userRef.current
      ) {
        shouldUnlockOnActiveRef.current = true;
        setUser(null);
        return;
      }
      if (nextState === 'active' && shouldUnlockOnActiveRef.current) {
        shouldUnlockOnActiveRef.current = false;
        void loginWithBiometrics(t('biometricPrompt'));
      }
    });
    return () => subscription.remove();
  }, [loginWithBiometrics, t]);
  const value = useMemo(
    () => ({
      booting,
      user,
      biometricLoginAvailable,
      biometricLoginEnabled,
      biometricLoginSupported,
      sessionMessage,
      login: async (email: string, password: string) =>
        accept(await authApi.login(email, password)),
      loginWithBiometrics,
      enableBiometricLogin,
      disableBiometricLogin,
      register: async (input: RegisterInput, registrationToken: string) =>
        accept(await authApi.register(input, registrationToken)),
      updateProfile: async (input: UpdateProfileInput) => {
        const updated = await authApi.updateProfile(input);
        const stored = await authStorage.read();
        if (stored)
          await authStorage.save({
            accessToken: stored.accessToken,
            user: updated,
          });
        setUser(updated);
        setLocale(updated.languageCode);
      },
      logout,
      refreshUser,
      clearSessionMessage: () => setSessionMessage(null),
    }),
    [
      accept,
      biometricLoginEnabled,
      biometricLoginAvailable,
      biometricLoginSupported,
      booting,
      disableBiometricLogin,
      enableBiometricLogin,
      loginWithBiometrics,
      logout,
      refreshUser,
      sessionMessage,
      user,
    ]
  );
  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}
export function useAppSession(): AppSessionValue {
  const value = useContext(AppSessionContext);
  if (!value)
    throw new Error('useAppSession must be used inside AppSessionProvider');
  return value;
}
