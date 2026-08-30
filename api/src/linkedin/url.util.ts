import { LinkedInError } from './linkedin.errors';

export function parsePublicId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw LinkedInError.invalidUrl(input);

  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{1,98}[a-zA-Z0-9])?$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    throw LinkedInError.invalidUrl(input);
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
    throw LinkedInError.invalidUrl(input);
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const inIndex = segments.indexOf('in');
  if (inIndex === -1 || !segments[inIndex + 1]) {
    throw LinkedInError.invalidUrl(input);
  }

  const slug = decodeURIComponent(segments[inIndex + 1]).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,98}[a-z0-9])?$/.test(slug)) {
    throw LinkedInError.invalidUrl(input);
  }
  return slug;
}

export function canonicalProfileUrl(publicId: string): string {
  return `https://www.linkedin.com/in/${publicId}`;
}
