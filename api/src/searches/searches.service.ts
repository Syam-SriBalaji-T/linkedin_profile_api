import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { JobsRepository } from '../jobs/jobs.repository';
import type { JobRow } from '../jobs/jobs.types';
import { canonicalProfileUrl, parsePublicId } from '../linkedin/url.util';
import type { NormalisedProfile } from '../normalise/profile.types';
import { ProfilesRepository } from '../profiles/profiles.repository';

export interface SearchView {
  job_id: string;
  public_id: string;
  profile_url: string;
  status: JobRow['status'];
  attempts: number;
  error: string | null;
  created_at: Date;
  finished_at: Date | null;
  profile: NormalisedProfile | null;
  from_cache: boolean;
}

@Injectable()
export class SearchesService {
  private readonly logger = new Logger(SearchesService.name);

  constructor(
    private readonly jobs: JobsRepository,
    private readonly profiles: ProfilesRepository,
    private readonly config: AppConfig,
  ) {}

  async create(userId: string, input: string, forceRefresh = false): Promise<SearchView> {
    const publicId = parsePublicId(input);
    const requestedUrl = input.trim();

    if (forceRefresh) {
      // The worker re-checks cache freshness before fetching, so a bypass must
      // expire the cached row here or the stale copy would be served again.
      await this.profiles.expire(publicId);
    } else {
      const cached = await this.profiles.findFresh(publicId);
      if (cached) {
        const job = await this.jobs.createAlreadyDone({
          userId,
          publicId,
          requestedUrl,
          profileId: cached.id,
        });
        return this.toView(job, cached.normalised, true);
      }
    }

    const job = await this.jobs.create({ userId, publicId, requestedUrl });
    this.logger.log(`Queued job ${job.id} for ${publicId}`);
    return this.toView(job, null, false);
  }

  async findOne(userId: string, jobId: string): Promise<SearchView> {
    const job = await this.jobs.findByIdForUser(jobId, userId);
    if (!job) throw new NotFoundException('Search not found');

    const profile = job.profile_id
      ? (await this.profiles.findByPublicId(job.public_id))?.normalised ?? null
      : null;

    return this.toView(job, profile, false);
  }

  async list(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: SearchView[]; total: number; limit: number; offset: number }> {
    const [rows, total] = await Promise.all([
      this.jobs.listForUser(userId, limit, offset),
      this.jobs.countForUser(userId),
    ]);

    return {
      items: rows.map((job) => this.toView(job, null, false)),
      total,
      limit,
      offset,
    };
  }

  private toView(
    job: JobRow,
    profile: NormalisedProfile | null,
    fromCache: boolean,
  ): SearchView {
    return {
      job_id: job.id,
      public_id: job.public_id,
      profile_url: canonicalProfileUrl(job.public_id),
      status: job.status,
      attempts: job.attempts,
      error: job.last_error,
      created_at: job.created_at,
      finished_at: job.finished_at,
      profile,
      from_cache: fromCache,
    };
  }
}
