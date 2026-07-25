import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

type AppSessionValue = {
  isAuthenticated: boolean;
  enterPreview: () => void;
  leavePreview: () => void;
};
const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const value = useMemo(
    () => ({
      isAuthenticated,
      enterPreview: () => setAuthenticated(true),
      leavePreview: () => setAuthenticated(false),
    }),
    [isAuthenticated]
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
