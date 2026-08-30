import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CorsOriginsRepository } from './cors-origins.repository';
import { normaliseOrigin } from './cors.types';

const REFRESH_INTERVAL_MS = 30_000;

@Injectable()
export class CorsService implements OnModuleInit {
  private readonly logger = new Logger(CorsService.name);

  private allowed = new Set<string>();
  private loadedAt = 0;
  private everLoaded = false;
  private inFlight?: Promise<void>;

  constructor(private readonly repo: CorsOriginsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.refresh().catch(() => undefined);
  }

  async isAllowed(origin: string): Promise<boolean> {
    if (Date.now() - this.loadedAt > REFRESH_INTERVAL_MS) {
      await this.refresh().catch(() => undefined);
    }

    // Fail closed: a database problem must not open the API to every origin.
    if (!this.everLoaded) {
      this.logger.warn(
        `Rejecting origin ${origin}: the CORS allowlist has never loaded ` +
          '(has 002_cors_origins.sql been applied?)',
      );
      return false;
    }

    return this.allowed.has(normaliseOrigin(origin));
  }

  invalidate(): void {
    this.loadedAt = 0;
  }

  snapshot(): { origins: string[]; loaded: boolean; ageMs: number } {
    return {
      origins: [...this.allowed],
      loaded: this.everLoaded,
      ageMs: this.everLoaded ? Date.now() - this.loadedAt : -1,
    };
  }

  private refresh(): Promise<void> {
    this.inFlight ??= this.load().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async load(): Promise<void> {
    try {
      const origins = await this.repo.listEnabled();
      this.allowed = new Set(origins.map(normaliseOrigin));
      this.loadedAt = Date.now();

      if (!this.everLoaded) {
        this.logger.log(`CORS allowlist loaded: ${origins.length} origin(s)`);
      }
      this.everLoaded = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to refresh the CORS allowlist${this.everLoaded ? ' (serving the cached list)' : ''}: ${message}`,
      );
      throw err;
    }
  }
}
