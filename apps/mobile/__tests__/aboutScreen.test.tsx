import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import {
  isPayPalDonationUrl,
  openPayPalDonation,
} from '../utils/paypalDonation';

jest.mock('../config', () => ({
  PAYPAL_DONATION_URL:
    'https://www.paypal.com/donate/?hosted_button_id=button-id',
}));
jest.mock('../components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../context/LocalizationContext', () => ({
  useLocalization: () => ({ t: (key: string) => key }),
}));
jest.mock('../utils/paypalDonation', () => ({
  isPayPalDonationUrl: jest.fn(),
  openPayPalDonation: jest.fn(),
}));

describe('AboutScreen', () => {
  beforeEach(() => {
    (isPayPalDonationUrl as jest.Mock).mockReturnValue(true);
    (openPayPalDonation as jest.Mock).mockResolvedValue(true);
  });

  it('presents the localized project and donation content', () => {
    const screen = render(<AboutScreen />);

    expect(screen.getByText('aboutTitle')).toBeTruthy();
    expect(screen.getByText('aboutMission')).toBeTruthy();
    expect(screen.getByText('aboutCollaboration')).toBeTruthy();
    expect(screen.getByText('aboutContactEmail')).toBeTruthy();
    expect(screen.getByText('aboutSupportTitle')).toBeTruthy();
  });

  it('opens the configured PayPal donation page', async () => {
    const screen = render(<AboutScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'donate' }));

    await waitFor(() => expect(openPayPalDonation).toHaveBeenCalledTimes(1));
  });

  it('disables donations when no valid hosted URL is configured', () => {
    (isPayPalDonationUrl as jest.Mock).mockReturnValue(false);
    const screen = render(<AboutScreen />);

    expect(
      screen.getByRole('button', { name: 'donate' }).props.accessibilityState
        .disabled
    ).toBe(true);
    expect(screen.getByText('donationUnavailable')).toBeTruthy();
  });
});
