const value = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export const API_URL = value.replace(/\/+$/, '');
