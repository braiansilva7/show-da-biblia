import { API_URL } from '../config';
import { authStorage } from '../storage/authStorage';
import { emitSessionExpiration } from '../utils/authEvents';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  authenticated?: boolean;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function endpoint(path: string) {
  return `${API_URL}${path}`;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'API URL is not configured.');
  const token =
    options.authenticated === false ? null : await authStorage.getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(endpoint(path), { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    await authStorage.clear();
    emitSessionExpiration();
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    throw new ApiError(
      response.status,
      typeof body?.message === 'string' ? body.message : 'Request failed.'
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
