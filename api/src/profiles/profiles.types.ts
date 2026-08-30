import type { NormalisedProfile } from '../normalise/profile.types';

export interface ProfileCacheRow {
  id: string;
  public_id: string;
  profile_url: string;
  normalised: NormalisedProfile;
  raw: unknown;
  schema_version: number;
  fetched_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}
