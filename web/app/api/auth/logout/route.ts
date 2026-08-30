import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { clearSessionCookie, getSessionToken } from '@/lib/session';

export async function POST(): Promise<NextResponse> {
  const token = await getSessionToken();

  if (token) {
    await apiRequest<void>({ method: 'POST', path: '/auth/logout', token });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true }, { status: 200 });
}
