import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { NormalisedProfile } from '../normalise/profile.types';
import type { ProfileCacheRow } from './profiles.types';

@Injectable()
export class ProfilesRepository {
  constructor(private readonly db: DatabaseService) {}

  findByPublicId(publicId: string): Promise<ProfileCacheRow | undefined> {
    return this.db.queryOne<ProfileCacheRow>(
      'SELECT * FROM profiles_cache WHERE public_id = $1',
      [publicId],
    );
  }

  async findFresh(publicId: string): Promise<ProfileCacheRow | undefined> {
    return this.db.queryOne<ProfileCacheRow>(
      'SELECT * FROM profiles_cache WHERE public_id = $1 AND expires_at > now()',
      [publicId],
    );
  }

  async upsert(params: {
    publicId: string;
    profileUrl: string;
    normalised: NormalisedProfile;
    raw: unknown;
    schemaVersion: number;
    ttlHours: number;
  }): Promise<ProfileCacheRow> {
    const row = await this.db.queryOne<ProfileCacheRow>(
      `INSERT INTO profiles_cache
         (public_id, profile_url, normalised, raw, schema_version, fetched_at, expires_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, now(), now() + ($6 || ' hours')::interval)
       ON CONFLICT (public_id) DO UPDATE SET
         profile_url    = EXCLUDED.profile_url,
         normalised     = EXCLUDED.normalised,
         raw            = EXCLUDED.raw,
         schema_version = EXCLUDED.schema_version,
         fetched_at     = EXCLUDED.fetched_at,
         expires_at     = EXCLUDED.expires_at,
         updated_at     = now()
       RETURNING *`,
      [
        params.publicId,
        params.profileUrl,
        JSON.stringify(params.normalised),
        params.raw === undefined ? null : JSON.stringify(params.raw),
        params.schemaVersion,
        String(params.ttlHours),
      ],
    );
    return row!;
  }
}
