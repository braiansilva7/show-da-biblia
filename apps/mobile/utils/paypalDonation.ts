import { Linking } from 'react-native';
import type { Locale } from '../types/game';

const PAYPAL_DONATION_URLS: Record<Locale, string> = {
  'pt-BR': 'https://www.paypal.com/donate/?hosted_button_id=3TZJCZPDRAGKN',
  en: 'https://www.paypal.com/donate/?hosted_button_id=KM37LUFQRDAZW',
  es: 'https://www.paypal.com/donate/?hosted_button_id=KM37LUFQRDAZW',
};

export function getPayPalDonationUrl(locale: Locale) {
  return PAYPAL_DONATION_URLS[locale];
}

function isPayPalHost(hostname: string) {
  return hostname === 'paypal.com' || hostname.endsWith('.paypal.com');
}

export function isPayPalDonationUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && isPayPalHost(url.hostname);
  } catch {
    return false;
  }
}

export async function openPayPalDonation(value: string) {
  if (!isPayPalDonationUrl(value)) return false;
  try {
    if (!(await Linking.canOpenURL(value))) return false;
    await Linking.openURL(value);
    return true;
  } catch {
    return false;
  }
}
