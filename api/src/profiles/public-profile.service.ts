import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { ProfileFetcher } from '../linkedin/profile-fetcher';
import { parsePublicId } from '../linkedin/url.util';
import { NormaliserService } from '../normalise/normaliser.service';
import { PROFILE_SCHEMA_VERSION, type NormalisedProfile } from '../normalise/profile.types';
import { ProfilesRepository } from './profiles.repository';

export interface ProfileResult {
  cached: boolean;
  fetched_at: string;
  profile: NormalisedProfile;
}

@Injectable()
export class PublicProfileService {
  private readonly logger = new Logger(PublicProfileService.name);

  constructor(
    private readonly fetcher: ProfileFetcher,
    private readonly normaliser: NormaliserService,
    private readonly profiles: ProfilesRepository,
    private readonly config: AppConfig,
  ) {}

  /**
   * Resolve a LinkedIn profile URL to structured JSON, serving a fresh cache
   * hit when present so repeat calls do not hit LinkedIn.
   */
  async getProfile(inputUrl: string, forceRefresh = false): Promise<ProfileResult> {
    const publicId = parsePublicId(inputUrl);

    if (!forceRefresh) {
      const fresh = await this.profiles.findFresh(publicId);
      if (fresh) {
        return { cached: true, fetched_at: fresh.fetched_at.toISOString(), profile: fresh.normalised };
      }
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

    this.logger.log(`Fetched profile ${publicId}`);
    return { cached: false, fetched_at: row.fetched_at.toISOString(), profile: normalised };
  }
}
