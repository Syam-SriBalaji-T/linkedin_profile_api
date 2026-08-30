import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LinkedInSessionService } from '../linkedin/linkedin-session.service';
import { buildInfo } from './build-info';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  ok: boolean;
  database: 'up' | 'down';
  session_valid: boolean | null;
  version: string;
  commit: string;
  uptime_seconds: number;
  started_at: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly session: LinkedInSessionService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [dbUp, sessionValid] = await Promise.all([
      this.db.ping(),
      this.session.isValid().catch(() => null),
    ]);

    const info = buildInfo();
    return {
      // The database is the only hard dependency; a lapsed LinkedIn session
      // degrades fetches but the service still serves cached data.
      status: dbUp ? 'ok' : 'degraded',
      ok: dbUp,
      database: dbUp ? 'up' : 'down',
      session_valid: sessionValid,
      version: info.version,
      commit: info.commit,
      uptime_seconds: Math.floor(process.uptime()),
      started_at: info.started_at,
    };
  }
}
