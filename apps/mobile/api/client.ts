import { API_URL } from '../config';

export type ApiClient = { baseUrl: string; isConfigured: boolean };

/** Network requests will be introduced together with the authenticated API flow. */
export const apiClient: ApiClient = {
  baseUrl: API_URL,
  isConfigured: API_URL.length > 0,
};
