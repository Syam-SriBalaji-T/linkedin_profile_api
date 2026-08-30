import { Injectable } from '@nestjs/common';
import type { RawProfile } from '../linkedin/profile-fetcher';
import { parseProfileHtml } from './html-parser';
import type { NormalisedProfile } from './profile.types';

@Injectable()
export class NormaliserService {
  normalise(raw: RawProfile): NormalisedProfile {
    return parseProfileHtml(raw.payload, raw.publicId, raw.profileUrl);
  }
}
