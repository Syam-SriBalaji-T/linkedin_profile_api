import 'server-only';
import { NextResponse } from 'next/server';
import { apiRequest, type ApiResult } from './api';
import { getSessionToken } from './session';

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status });
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await req.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export async function withSession<T>(
  fn: (token: string) => Promise<ApiResult<T>>,
): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) return errorResponse('Not signed in', 401);

  const result = await fn(token);
  if (!result.ok) return errorResponse(result.message, result.status);

  return result.status === 204
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(result.data, { status: result.status });
}

export { apiRequest };
