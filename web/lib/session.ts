// server-only: importing this from a client component is a build error.
import 'server-only';
import { cookies } from 'next/headers';
import { sessionCookieName } from './constants';

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(sessionCookieName())?.value || undefined;
}

export async function setSessionCookie(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  const expires = new Date(expiresAt);

  store.set({
    name: sessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE?.trim() === 'true',
    path: '/',
    expires: Number.isNaN(expires.getTime())
      ? new Date(Date.now() + 7 * 24 * 3_600_000)
      : expires,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set({
    name: sessionCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE?.trim() === 'true',
    path: '/',
    maxAge: 0,
  });
}
