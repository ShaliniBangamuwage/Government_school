import { auth } from '../firebase/config';

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchWithAuth<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
  let normalizedUrl: string;
  if (url.startsWith('http')) {
    normalizedUrl = url;
  } else {
    // ensure leading slash
    let path = url.startsWith('/') ? url : `/${url}`;
    // avoid duplicate '/api' when baseUrl already contains the api prefix
    if (baseUrl.endsWith('/api') && path.startsWith('/api/')) {
      path = path.replace(/^\/api/, '')
    }
    normalizedUrl = `${baseUrl}${path}`;
  }
  const requestHeaders = new Headers(init.headers ?? {});

  if (!auth.currentUser) {
    requestHeaders.delete('Authorization');
  } else {
    const token = await auth.currentUser.getIdToken();
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (!requestHeaders.has('Content-Type') && !(init.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(normalizedUrl, {
    ...init,
    headers: requestHeaders,
  });

  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown = null;

  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else if (response.status !== 204) {
    payload = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload && typeof (payload as { message?: string }).message === 'string'
        ? (payload as { message: string }).message
        : 'The request could not be completed.';

    throw new ApiError(message, response.status, payload);
  }

  return (payload ?? undefined) as T;
}
