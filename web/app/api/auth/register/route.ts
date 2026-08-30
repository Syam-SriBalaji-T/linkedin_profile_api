import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { errorResponse, readJsonBody } from '@/lib/route-helpers';
import { setSessionCookie } from '@/lib/session';
import type { LoginResult } from '@/lib/types';

export async function POST(req: Request): Promise<NextResponse> {
  const body = await readJsonBody(req);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return errorResponse('Email and password are required', 400);
  }
  if (password.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }

  const result = await apiRequest<LoginResult>({
    method: 'POST',
    path: '/auth/register',
    body: { email, password },
  });

  if (!result.ok) return errorResponse(result.message, result.status);

  await setSessionCookie(result.data.token, result.data.expires_at);

  return NextResponse.json({ user: result.data.user }, { status: 201 });
}
