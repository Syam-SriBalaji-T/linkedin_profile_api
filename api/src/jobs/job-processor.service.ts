import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { LinkedInError } from '../linkedin/linkedin.errors';
import { LinkedInSessionService } from '../linkedin/linkedin-session.service';
import { ProfileFetcher } from '../linkedin/profile-fetcher';
import { NormaliserService } from '../normalise/normaliser.service';
import { PROFILE_SCHEMA_VERSION } from '../normalise/profile.types';
import { ProfilesRepository } from '../profiles/profiles.repository';
import { JobsRepository } from './jobs.repository';
import type { JobRow } from './jobs.types';

@Injectable()
export class JobProcessorService {
  private readonly logger = new Logger(JobProcessorService.name);

  constructor(
    private readonly jobs: JobsRepository,
    private readonly profiles: ProfilesRepository,
    private readonly fetcher: ProfileFetcher,
    private readonly normaliser: NormaliserService,
    private readonly session: LinkedInSessionService,
    private readonly db: DatabaseService,
    private readonly config: AppConfig,
  ) {}

  async process(job: JobRow): Promise<void> {
    try {
      const profileId = await this.fetchAndCache(job.public_id);
      await this.jobs.markDone(job.id, profileId);
      this.logger.log(`Job ${job.id} done (${job.public_id})`);
    } catch (err) {
      await this.handleFailure(job, err);
    }
  }

  private async fetchAndCache(publicId: string): Promise<string> {
    const lockKey = advisoryLockKey(publicId);

    return this.db.transaction(async (client) => {
      // Transaction-scoped: session-scoped locks break through a PgBouncer pooler.
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

      const fresh = await this.profiles.findFresh(publicId);
      if (fresh) {
        this.logger.debug(`Cache filled by a peer for ${publicId}; skipping fetch`);
        return fresh.id;
      }

      const raw = await this.fetcher.fetchProfile(publicId);
      const normalised = this.normaliser.normalise(raw);

      const row = await this.profiles.upsert({
        publicId,
        profileUrl: raw.profileUrl,
        normalised,
        raw: raw.payload,
        schemaVersion: PROFILE_SCHEMA_VERSION,
        ttlHours: this.config.profileCacheTtlHours,
      });
      return row.id;
    });
  }

  private async handleFailure(job: JobRow, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);

    let retryable = true;
    if (err instanceof LinkedInError) {
      retryable = err.retryable;
      if (err.kind === 'session_invalid') this.session.invalidate();
    }

    const attemptsExhausted = job.attempts >= this.config.jobMaxAttempts;
    const terminal = !retryable || attemptsExhausted;

    await this.jobs.markFailed(job.id, message, terminal);

    const reason = terminal
      ? retryable
        ? `giving up after ${job.attempts} attempt(s)`
        : 'not retryable'
      : 're-queued for retry';
    this.logger.warn(`Job ${job.id} failed (${reason}): ${message}`);
  }
}

function advisoryLockKey(publicId: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (const byte of Buffer.from(publicId, 'utf8')) {
    hash = ((hash ^ BigInt(byte)) * prime) & mask;
  }

  const signed = hash > 0x7fffffffffffffffn ? hash - 0x10000000000000000n : hash;
  return signed.toString();
}
