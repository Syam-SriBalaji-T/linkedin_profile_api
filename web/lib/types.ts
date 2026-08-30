export interface PublicUser {
  id: string;
  email: string;
  created_at: string;
}

export interface LoginResult {
  token: string;
  expires_at: string;
  user: PublicUser;
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

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

export interface SearchView {
  job_id: string;
  public_id: string;
  profile_url: string;
  status: JobStatus;
  attempts: number;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  profile: NormalisedProfile | null;
  from_cache: boolean;
}

export interface SearchList {
  items: SearchView[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  ok: boolean;
  session_valid: boolean | null;
  database: 'up' | 'down';
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
}
