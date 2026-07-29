const value = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
const paypalDonationUrl =
  process.env.EXPO_PUBLIC_PAYPAL_DONATION_URL?.trim() ?? '';

export const API_URL = value.replace(/\/+$/, '');
export const PAYPAL_DONATION_URL = paypalDonationUrl;
