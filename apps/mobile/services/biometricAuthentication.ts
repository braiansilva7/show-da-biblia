import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricAuthenticationResult =
  | 'success'
  | 'cancelled'
  | 'failed';

const cancellationErrors = new Set([
  'user_cancel',
  'app_cancel',
  'system_cancel',
]);

export async function isBiometricAuthenticationAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(
  promptMessage: string
): Promise<BiometricAuthenticationResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: 'strong',
      disableDeviceFallback: true,
      fallbackLabel: '',
      promptMessage,
      requireConfirmation: true,
    });
    if (result.success) return 'success';
    return cancellationErrors.has(result.error) ? 'cancelled' : 'failed';
  } catch {
    return 'failed';
  }
}
