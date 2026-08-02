import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import {
  getPayPalDonationUrl,
  isPayPalDonationUrl,
  openPayPalDonation,
} from '../utils/paypalDonation';

jest.mock('../components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../context/LocalizationContext', () => ({
  useLocalization: () => ({ locale: 'pt-BR', t: (key: string) => key }),
}));
jest.mock('../utils/paypalDonation', () => ({
  getPayPalDonationUrl: jest.fn(),
  isPayPalDonationUrl: jest.fn(),
  openPayPalDonation: jest.fn(),
}));

describe('AboutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPayPalDonationUrl as jest.Mock).mockReturnValue(
      'https://www.paypal.com/donate/?hosted_button_id=button-id'
    );
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

    expect(getPayPalDonationUrl).toHaveBeenCalledWith('pt-BR');
    await waitFor(() => expect(openPayPalDonation).toHaveBeenCalledTimes(1));
    expect(openPayPalDonation).toHaveBeenCalledWith(
      'https://www.paypal.com/donate/?hosted_button_id=button-id'
    );
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
