const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = env?.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data as T;
}

export { API_BASE_URL };
