export const PROFILE_SCHEMA_VERSION = 2;

export interface ExperienceRole {
  title: string | null;
  date_range: string | null;
  duration: string | null;
}

export interface Experience {
  company: string | null;
  company_url: string | null;
  logo_url: string | null;
  roles: ExperienceRole[];
}

export interface Education {
  school: string | null;
  degree: string | null;
  school_url: string | null;
  logo_url: string | null;
}

export interface NormalisedProfile {
  public_id: string;
  profile_url: string;
  name: string | null;
  headline: string | null;
  location: string | null;
  about: string | null;
  followers: string | null;
  picture_url: string | null;
  background_url: string | null;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  languages: string[];
  schema_version: number;
}
