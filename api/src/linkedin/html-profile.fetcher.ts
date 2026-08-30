import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { LinkedInError } from './linkedin.errors';
import { ProfileFetcher, type RawProfile } from './profile-fetcher';
import { canonicalProfileUrl } from './url.util';

// LinkedIn only server-renders the full profile HTML for a MOBILE user-agent;
// a desktop UA gets the JS shell with no data. This is the crux of the approach.
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36';

/**
 * Fetches the mobile server-rendered profile page over plain HTTP and returns
 * the raw HTML. No browser, no Voyager GraphQL (which needs a rotating
 * queryId) — just the page LinkedIn renders for mobile clients.
 */
@Injectable()
export class HtmlProfileFetcher extends ProfileFetcher {
  private readonly logger = new Logger(HtmlProfileFetcher.name);
  private lastRequestAt = 0;
  private pacingChain: Promise<void> = Promise.resolve();

  constructor(private readonly config: AppConfig) {
    super();
  }

  /** Serializes requests and spaces them by the configured minimum interval. */
  private async pace(): Promise<void> {
    const interval = this.config.linkedinMinRequestIntervalMs;
    this.pacingChain = this.pacingChain.then(async () => {
      const wait = this.lastRequestAt + interval - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastRequestAt = Date.now();
    });
    await this.pacingChain;
  }

  async fetchProfile(publicId: string): Promise<RawProfile> {
    const profileUrl = canonicalProfileUrl(publicId);
    const html = await this.get(`https://www.linkedin.com/in/${encodeURIComponent(publicId)}`);

    // A logged-out / walled response omits the profile heading.
    if (!/heading-large|<h1/i.test(html)) {
      if (/authwall|session_key|Sign in/i.test(html)) throw LinkedInError.sessionInvalid();
      throw LinkedInError.notFound(publicId);
    }

    return { publicId, profileUrl, payload: html };
  }

  async validateSession(): Promise<boolean> {
    if (!this.config.hasLinkedinCredentials) return false;
    try {
      const html = await this.get('https://www.linkedin.com/feed/');
      // The authenticated feed never contains the guest sign-in form.
      return !/authwall|uas\/login|google-one-tap/i.test(html) || /heading|feed/i.test(html);
    } catch (err) {
      if (err instanceof LinkedInError && err.kind === 'session_invalid') return false;
      this.logger.warn(
        `Session validation inconclusive: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  private resolveCookie(): string {
    const full = this.config.linkedinCookie;
    if (full) return full;
    const liAt = this.config.linkedinLiAt;
    const csrf = this.config.linkedinCsrfToken;
    if (!liAt || !csrf) throw LinkedInError.notConfigured();
    return `li_at=${liAt}; JSESSIONID="${csrf}"`;
  }

  private async get(url: string): Promise<string> {
    const cookie = this.resolveCookie();
    await this.pace();
    const timeoutMs = this.config.fetchTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          cookie,
          'user-agent': MOBILE_USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'upgrade-insecure-requests': '1',
        },
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw LinkedInError.timeout(timeoutMs);
      throw new LinkedInError(
        'upstream_error',
        `Network error calling LinkedIn: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) throw LinkedInError.sessionInvalid();
    if (res.status === 404 || res.status === 410) throw LinkedInError.notFound(url);
    if (res.status === 429) throw LinkedInError.rateLimited();
    if (res.status === 999) throw LinkedInError.blocked('status 999 (automated-traffic block)');
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location') ?? '';
      if (/\/(login|authwall|checkpoint|uas)/.test(loc)) throw LinkedInError.sessionInvalid();
      // A redirect to the same URL is LinkedIn's soft rate-limit signal.
      throw LinkedInError.rateLimited();
    }
    if (!res.ok) throw LinkedInError.upstream(res.status);

    return res.text();
  }
}
