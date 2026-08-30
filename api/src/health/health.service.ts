import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LinkedInSessionService } from '../linkedin/linkedin-session.service';

export interface HealthResponse {
  ok: boolean;
  session_valid: boolean | null;
  database: 'up' | 'down';
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

    return {
      ok: dbUp,
      session_valid: sessionValid,
      database: dbUp ? 'up' : 'down',
    };
  }
}
