import * as LocalAuthentication from 'expo-local-authentication';
import {
  authenticateWithBiometrics,
  isBiometricAuthenticationAvailable,
} from '../services/biometricAuthentication';

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));

describe('biometric authentication', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is unavailable without biometric hardware or enrollment', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    await expect(isBiometricAuthenticationAvailable()).resolves.toBe(false);

    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
    await expect(isBiometricAuthenticationAvailable()).resolves.toBe(false);
  });

  it('authenticates with strong biometrics and no device-passcode fallback', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
      success: true,
    });

    await expect(authenticateWithBiometrics('Confirm identity')).resolves.toBe(
      'success'
    );
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        biometricsSecurityLevel: 'strong',
        disableDeviceFallback: true,
        fallbackLabel: '',
        promptMessage: 'Confirm identity',
        requireConfirmation: true,
      })
    );
  });

  it('keeps cancellation distinct from biometric failures', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock)
      .mockResolvedValueOnce({ success: false, error: 'user_cancel' })
      .mockResolvedValueOnce({ success: false, error: 'authentication_failed' });

    await expect(authenticateWithBiometrics('Confirm identity')).resolves.toBe(
      'cancelled'
    );
    await expect(authenticateWithBiometrics('Confirm identity')).resolves.toBe(
      'failed'
    );
  });
});
