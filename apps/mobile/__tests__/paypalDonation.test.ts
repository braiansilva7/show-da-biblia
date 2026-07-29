import { Linking } from 'react-native';
import {
  isPayPalDonationUrl,
  openPayPalDonation,
} from '../utils/paypalDonation';

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

describe('PayPal donations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts secure PayPal-hosted donation URLs only', () => {
    expect(
      isPayPalDonationUrl(
        'https://www.paypal.com/donate/?hosted_button_id=button-id'
      )
    ).toBe(true);
    expect(isPayPalDonationUrl('http://www.paypal.com/donate')).toBe(false);
    expect(isPayPalDonationUrl('https://paypal.example.com/donate')).toBe(
      false
    );
    expect(isPayPalDonationUrl('')).toBe(false);
  });

  it('opens a valid donation URL when the device supports it', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    await expect(
      openPayPalDonation(
        'https://www.paypal.com/donate/?hosted_button_id=button-id'
      )
    ).resolves.toBe(true);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.paypal.com/donate/?hosted_button_id=button-id'
    );
  });

  it('does not open an unsupported or invalid donation URL', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await expect(
      openPayPalDonation('https://www.paypal.com/donate')
    ).resolves.toBe(false);
    await expect(
      openPayPalDonation('https://not-paypal.test/donate')
    ).resolves.toBe(false);

    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('returns false when the device fails to open the hosted donation page', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('Unavailable'));

    await expect(
      openPayPalDonation('https://www.paypal.com/donate')
    ).resolves.toBe(false);
  });
});
