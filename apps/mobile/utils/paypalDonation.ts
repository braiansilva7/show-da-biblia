import { Linking } from 'react-native';

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
