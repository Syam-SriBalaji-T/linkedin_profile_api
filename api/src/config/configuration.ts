import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService) {}

  private str(key: string): string | undefined {
    const v = this.config.get<string>(key);
    return v === undefined || v === '' ? undefined : v;
  }

  private num(key: string, fallback: number): number {
    const raw = this.str(key);
    if (raw === undefined) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  private require(key: string): string {
    const v = this.str(key);
    if (v === undefined) {
      throw new Error(`Required environment variable ${key} is not set (see api/.env.example)`);
    }
    return v;
  }

  get nodeEnv(): string {
    return this.str('NODE_ENV') ?? 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.num('PORT', 3001);
  }

  get databaseUrl(): string {
    return this.require('DATABASE_URL');
  }

  get hasDatabaseUrl(): boolean {
    return this.str('DATABASE_URL') !== undefined;
  }

  get databasePoolMax(): number {
    return this.num('DATABASE_POOL_MAX', 10);
  }

  get sessionTtlHours(): number {
    return this.num('SESSION_TTL_HOURS', 24);
  }

  get linkedinCookie(): string | undefined {
    return this.str('LINKEDIN_COOKIE');
  }

  get linkedinLiAt(): string | undefined {
    return this.str('LINKEDIN_LI_AT');
  }

  get linkedinCsrfToken(): string | undefined {
    return this.str('LINKEDIN_CSRF_TOKEN');
  }

  get hasLinkedinCredentials(): boolean {
    // Either the full browser cookie header, or the minimal li_at + csrf pair.
    if (this.linkedinCookie !== undefined) return true;
    return this.linkedinLiAt !== undefined && this.linkedinCsrfToken !== undefined;
  }

  get linkedinUserAgent(): string {
    return (
      this.str('LINKEDIN_USER_AGENT') ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
  }

  get fetchTimeoutMs(): number {
    return this.num('FETCH_TIMEOUT_MS', 20_000);
  }

  /** Minimum gap between outbound LinkedIn requests, to avoid soft-blocking. */
  get linkedinMinRequestIntervalMs(): number {
    return this.num('LINKEDIN_MIN_REQUEST_INTERVAL_MS', 4_000);
  }

  get profileCacheTtlHours(): number {
    return this.num('PROFILE_CACHE_TTL_HOURS', 24);
  }

  get jobMaxAttempts(): number {
    return this.num('JOB_MAX_ATTEMPTS', 3);
  }

  get workerPollIntervalMs(): number {
    return this.num('WORKER_POLL_INTERVAL_MS', 2_000);
  }

  get workerConcurrency(): number {
    return this.num('WORKER_CONCURRENCY', 1);
  }

  /** When true, the API process also runs the job worker loop (convenient for
   *  local dev / single-process deploys). In production run the worker
   *  separately and leave this false. */
  get runWorkerInApi(): boolean {
    return this.str('RUN_WORKER_IN_API') === 'true';
  }

  get jobStuckAfterMs(): number {
    return this.num('JOB_STUCK_AFTER_MS', 5 * 60_000);
  }
}
