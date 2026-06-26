export type Env = 'production' | 'staging';

export interface AuthOpts {
  token: string;
  env?: Env;
}

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
  query?: Record<string, string>;
  env?: Env;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: number | string;
  message?: string;
}

export class ApiError extends Error {
  code: number | string;
  status: number;

  constructor(code: number | string, message: string, status: number) {
    super(message || `API error ${code}`);
    this.code = code;
    this.status = status;
  }
}

// the one ring to rule all fetches!!!
export async function apiFetch<T = unknown>(
  path: string,
  { method = 'GET', body, token, query, env = 'production' }: ApiFetchOptions = {}
): Promise<T> {
  const { API_BASE, REMOTE_BASE } = await import('./config.js');
  const base = env === 'staging' ? REMOTE_BASE : API_BASE;
  const prefix = env === 'staging' ? '/staging' : '';
  let url = `${base}${prefix}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError(-1, `${msg}: ${method} ${url}`, 0);
  }

  let payload: ApiResponse<T>;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(-2, `Server returned non-JSON (HTTP ${res.status}): ${method} ${url}`, res.status);
  }

  if (!payload || payload.success !== true) {
    const code = payload?.error ?? res.status;
    const msg = payload?.message ?? 'Unknown error';
    throw new ApiError(code, msg, res.status);
  }

  return (payload.data ?? {}) as T;
}