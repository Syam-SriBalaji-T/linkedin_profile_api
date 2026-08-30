import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { ProfileFetcher } from './profile-fetcher';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class LinkedInSessionService {
  private readonly logger = new Logger(LinkedInSessionService.name);
  private cached?: { valid: boolean; at: number };
  private inFlight?: Promise<boolean>;

  constructor(
    private readonly fetcher: ProfileFetcher,
    private readonly config: AppConfig,
  ) {}

  async isValid(): Promise<boolean | null> {
    if (!this.config.hasLinkedinCredentials) return null;

    const now = Date.now();
    if (this.cached && now - this.cached.at < CACHE_TTL_MS) {
      return this.cached.valid;
    }

    this.inFlight ??= this.fetcher
      .validateSession()
      .then((valid) => {
        this.cached = { valid, at: Date.now() };
        if (!valid) this.logger.warn('LinkedIn session reported invalid.');
        return valid;
      })
      .finally(() => {
        this.inFlight = undefined;
      });

    return this.inFlight;
  }

  invalidate(): void {
    this.cached = undefined;
  }
}
