/**
 * Craly API client
 *
 * Usage (in any component or server action):
 *
 *   import { apiGet, apiPost } from '@/lib/api';
 *
 *   const data = await apiGet('/contractors');
 *   const newContractor = await apiPost('/contractors', { name: 'Acme Ltd' });
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}/api${path}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: { message?: string } }).error?.message ??
        `Request failed: ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<T>;
}

export const apiGet  = <T>(path: string, init?: RequestInit) =>
  request<T>(path, { method: 'GET', ...init });

export const apiPost = <T>(path: string, body: unknown, init?: RequestInit) =>
  request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...init,
  });

export const apiPatch = <T>(path: string, body: unknown, init?: RequestInit) =>
  request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...init,
  });

export const apiDelete = <T>(path: string, init?: RequestInit) =>
  request<T>(path, { method: 'DELETE', ...init });

/** Health check — useful for integration smoke tests */
export const checkHealth = () =>
  apiGet<{ status: string; timestamp: string; db: { status: string } }>('/health');
