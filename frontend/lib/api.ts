export const getApiUrl = (path: string) => {
  let base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

function parseErrorMessage(errorBody: any, fallback: string): string {
  if (!errorBody) return fallback;
  if (typeof errorBody === 'string') return errorBody;
  if (typeof errorBody.error === 'string') return errorBody.error;
  if (errorBody.error && typeof errorBody.error.message === 'string') return errorBody.error.message;
  if (typeof errorBody.message === 'string') return errorBody.message;
  return fallback;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(parseErrorMessage(errorBody, `Request failed: ${res.status} ${res.statusText}`));
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

export async function apiUpload<T>(path: string, formData: FormData, init?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    ...init,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(parseErrorMessage(errorBody, `Upload failed: ${res.status} ${res.statusText}`));
  }

  return res.json() as Promise<T>;
}

/** Health check — useful for integration smoke tests */
export const checkHealth = () =>
  fetch(getApiUrl('/health')).then((r) => r.json());
