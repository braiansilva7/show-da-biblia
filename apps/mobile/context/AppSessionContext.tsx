import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { authApi } from '../api/authApi';
import { authStorage } from '../storage/authStorage';
import type {
  AuthSession,
  MobileUser,
  RegisterInput,
  UpdateProfileInput,
} from '../types/auth';
import { subscribeToSessionExpiration } from '../utils/authEvents';
import { useLocalization } from './LocalizationContext';

type AppSessionValue = {
  booting: boolean;
  user: MobileUser | null;
  sessionMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput, registrationToken: string) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionMessage: () => void;
  refreshUser: () => Promise<void>;
};
const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({ children }: PropsWithChildren) {
  const { setLocale } = useLocalization();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const accept = useCallback(
    async (session: AuthSession) => {
      await authStorage.save(session);
      setUser(session.user);
      setLocale(session.user.languageCode);
    },
    [setLocale]
  );
  const logout = useCallback(async () => {
    await authStorage.clear();
    setUser(null);
  }, []);
  const refreshUser = useCallback(async () => {
    const recovered = await authApi.me();
    const stored = await authStorage.read();
    if (stored)
      await authStorage.save({ accessToken: stored.accessToken, user: recovered });
    setUser(recovered);
    setLocale(recovered.languageCode);
  }, [setLocale]);
  useEffect(() => {
    void (async () => {
      const stored = await authStorage.read();
      if (stored) {
        try {
          const recovered = await authApi.me();
          await authStorage.save({
            accessToken: stored.accessToken,
            user: recovered,
          });
          setUser(recovered);
          setLocale(recovered.languageCode);
        } catch {
          await authStorage.clear();
        }
      }
      setBooting(false);
    })();
    return subscribeToSessionExpiration(() => {
      setUser(null);
      setSessionMessage('expired');
    });
  }, []);
  const value = useMemo(
    () => ({
      booting,
      user,
      sessionMessage,
      login: async (email: string, password: string) =>
        accept(await authApi.login(email, password)),
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
    [accept, booting, logout, refreshUser, sessionMessage, user]
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
