export type DonationLocale = 'pt' | 'en' | 'es';

const donationUrls: Record<DonationLocale, string> = {
  pt: 'https://www.paypal.com/donate/?hosted_button_id=3TZJCZPDRAGKN',
  en: 'https://www.paypal.com/donate/?hosted_button_id=KM37LUFQRDAZW',
  es: 'https://www.paypal.com/donate/?hosted_button_id=KM37LUFQRDAZW',
};

export function getPayPalDonationUrl(locale: DonationLocale): string {
  return donationUrls[locale];
}

export function isPayPalDonationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'paypal.com' || url.hostname.endsWith('.paypal.com'))
    );
  } catch {
    return false;
  }
}

export function openPayPalDonation(value: string): boolean {
  if (!isPayPalDonationUrl(value)) return false;
  const page = window.open(value, '_blank', 'noopener,noreferrer');
  if (!page) return false;
  page.opener = null;
  return true;
}
