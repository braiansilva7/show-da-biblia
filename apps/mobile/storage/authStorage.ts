import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthSession } from '../types/auth';

const TOKEN_KEY = 'show-da-biblia.auth.token';
const USER_KEY = 'show-da-biblia.auth.user';
const BIOMETRIC_LOGIN_ENABLED_KEY = 'show-da-biblia.auth.biometric-login-enabled';

function isWebStorageAvailable() {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

async function readValue(key: string): Promise<string | null> {
  if (isWebStorageAvailable()) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeValue(key: string, value: string): Promise<void> {
  if (isWebStorageAvailable()) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeValue(key: string): Promise<void> {
  if (isWebStorageAvailable()) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const authStorage = {
  async getToken() {
    return readValue(TOKEN_KEY);
  },
  async read(): Promise<AuthSession | null> {
    const [accessToken, rawUser] = await Promise.all([
      readValue(TOKEN_KEY),
      readValue(USER_KEY),
    ]);
    if (!accessToken || !rawUser) return null;
    try {
      return { accessToken, user: JSON.parse(rawUser) as AuthSession['user'] };
    } catch {
      await this.clear();
      return null;
    }
  },
  async save(session: AuthSession) {
    await Promise.all([
      writeValue(TOKEN_KEY, session.accessToken),
      writeValue(USER_KEY, JSON.stringify(session.user)),
    ]);
  },
  async isBiometricLoginEnabled() {
    return (await readValue(BIOMETRIC_LOGIN_ENABLED_KEY)) === 'true';
  },
  async setBiometricLoginEnabled(enabled: boolean) {
    if (enabled) {
      await writeValue(BIOMETRIC_LOGIN_ENABLED_KEY, 'true');
      return;
    }
    await removeValue(BIOMETRIC_LOGIN_ENABLED_KEY);
  },
  async clear() {
    await Promise.all([
      removeValue(TOKEN_KEY),
      removeValue(USER_KEY),
      removeValue(BIOMETRIC_LOGIN_ENABLED_KEY),
    ]);
  },
};
