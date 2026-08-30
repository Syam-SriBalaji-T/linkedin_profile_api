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

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface Position {
  title: string | null;
  company: string | null;
  location: string | null;
  description: string | null;
  dates: DateRange;
  current: boolean;
}

export interface Education {
  school: string | null;
  degree: string | null;
  field: string | null;
  dates: DateRange;
}

export interface NormalisedProfile {
  public_id: string;
  profile_url: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  industry: string | null;
  picture_url: string | null;
  positions: Position[];
  education: Education[];
  skills: string[];
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
