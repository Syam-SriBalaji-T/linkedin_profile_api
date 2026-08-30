import 'server-only';
import type { ApiErrorBody } from './types';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

const DEFAULT_TIMEOUT_MS = 15_000;

function baseUrl(): string {
  const raw = process.env.API_BASE_URL?.trim();
  if (!raw) {
    throw new Error('API_BASE_URL is not set — copy web/.env.example to web/.env and fill it in');
  }
  return raw.replace(/\/+$/, '');
}

function readErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const { message, error } = body as Partial<ApiErrorBody>;
    if (Array.isArray(message) && message.length > 0) return message.join(', ');
    if (typeof message === 'string' && message) return message;
    if (typeof error === 'string' && error) return error;
  }
  return `Request failed with status ${status}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  path: string;
  token?: string;
  body?: unknown;
  cache?: RequestCache;
}

export async function apiRequest<T>(opts: RequestOptions): Promise<ApiResult<T>> {
  const { method = 'GET', path, token, body } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: opts.cache ?? 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 504, message: 'The API did not respond in time' };
    }
    return {
      ok: false,
      status: 503,
      message:
        err instanceof Error && /fetch failed|ECONNREFUSED/i.test(err.message)
          ? 'Cannot reach the API. Is the api/ service running on API_BASE_URL?'
          : `Cannot reach the API: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    return {
      ok: false,
      status: res.status,
      message: res.ok ? 'The API returned a malformed response' : readErrorMessage(text, res.status),
    };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, message: readErrorMessage(parsed, res.status) };
  }

  return { ok: true, status: res.status, data: parsed as T };
}
