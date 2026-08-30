export const DEFAULT_COOKIE_NAME = 'unfurl_session';

export function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME;
}
