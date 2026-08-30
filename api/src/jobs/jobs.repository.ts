import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { JobRow } from './jobs.types';

@Injectable()
export class JobsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(params: {
    userId: string;
    publicId: string;
    requestedUrl: string;
  }): Promise<JobRow> {
    const row = await this.db.queryOne<JobRow>(
      `INSERT INTO jobs (user_id, public_id, requested_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [params.userId, params.publicId, params.requestedUrl],
    );
    return row!;
  }

  async createAlreadyDone(params: {
    userId: string;
    publicId: string;
    requestedUrl: string;
    profileId: string;
  }): Promise<JobRow> {
    const row = await this.db.queryOne<JobRow>(
      `INSERT INTO jobs
         (user_id, public_id, requested_url, status, profile_id, started_at, finished_at)
       VALUES ($1, $2, $3, 'done', $4, now(), now())
       RETURNING *`,
      [params.userId, params.publicId, params.requestedUrl, params.profileId],
    );
    return row!;
  }

  findByIdForUser(id: string, userId: string): Promise<JobRow | undefined> {
    return this.db.queryOne<JobRow>('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
  }

  // FOR UPDATE SKIP LOCKED lets several workers poll without colliding.
  async claimNext(): Promise<JobRow | undefined> {
    return this.db.queryOne<JobRow>(
      `UPDATE jobs SET
         status     = 'running',
         attempts   = attempts + 1,
         started_at = now(),
         updated_at = now()
       WHERE id = (
         SELECT id FROM jobs
          WHERE status = 'queued'
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
       )
       RETURNING *`,
    );
  }

  async markDone(id: string, profileId: string): Promise<void> {
    await this.db.query(
      `UPDATE jobs SET
         status      = 'done',
         profile_id  = $2,
         last_error  = NULL,
         finished_at = now(),
         updated_at  = now()
       WHERE id = $1`,
      [id, profileId],
    );
  }

  async markFailed(id: string, error: string, terminal: boolean): Promise<void> {
    await this.db.query(
      `UPDATE jobs SET
         status      = $3,
         last_error  = $2,
         finished_at = CASE WHEN $3 = 'failed' THEN now() ELSE NULL END,
         updated_at  = now()
       WHERE id = $1`,
      [id, error.slice(0, 2000), terminal ? 'failed' : 'queued'],
    );
  }

  async reapStuck(stuckAfterMs: number, maxAttempts: number): Promise<number> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE jobs SET
         status     = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'queued' END,
         last_error = 'worker did not finish; reclaimed by reaper',
         updated_at = now()
       WHERE status = 'running'
         AND started_at < now() - ($1 || ' milliseconds')::interval
       RETURNING id`,
      [String(stuckAfterMs), maxAttempts],
    );
    return rows.length;
  }

  listForUser(userId: string, limit: number, offset: number): Promise<JobRow[]> {
    return this.db.query<JobRow>(
      `SELECT * FROM jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
  }

  async countForUser(userId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT count(*)::text AS count FROM jobs WHERE user_id = $1',
      [userId],
    );
    return Number(row?.count ?? 0);
  }
}
