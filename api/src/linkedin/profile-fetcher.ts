export interface RawProfile {
  publicId: string;
  profileUrl: string;
  payload: string;
}

export abstract class ProfileFetcher {
  abstract fetchProfile(publicId: string): Promise<RawProfile>;

  abstract validateSession(): Promise<boolean>;
}
