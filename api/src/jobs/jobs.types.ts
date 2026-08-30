export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface JobRow {
  id: string;
  user_id: string;
  public_id: string;
  requested_url: string;
  status: JobStatus;
  attempts: number;
  last_error: string | null;
  profile_id: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
