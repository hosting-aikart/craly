export const getApiUrl = (path: string): string => {
  let raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ''
  ).trim();

  if (!raw) {
    if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      console.warn(
        `[Craly API Warning] NEXT_PUBLIC_API_URL is NOT set in Vercel environment variables! ` +
        `API requests are falling back to http://localhost:8080/api which will fail on deployed sites. ` +
        `Please set NEXT_PUBLIC_API_URL in Vercel settings and REDEPLOY.`
      );
    }
    raw = 'http://localhost:8080/api';
  }

  // Ensure protocol if domain was provided without http:// or https://
  if (!raw.startsWith('http://') && !raw.startsWith('https://') && !raw.startsWith('/')) {
    raw = `https://${raw}`;
  }

  let base = raw.replace(/\/$/, '');
  if (!base.endsWith('/api') && !base.includes('/api/')) {
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
