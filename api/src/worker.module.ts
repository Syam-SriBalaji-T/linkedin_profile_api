import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { JobRunnerService, WORKER_AUTOSTART } from './jobs/job-runner.service';
import { JobsModule } from './jobs/jobs.module';

/** Standalone worker process: always runs the polling loop. */
@Module({
  imports: [AppConfigModule, DatabaseModule, JobsModule],
  providers: [JobRunnerService, { provide: WORKER_AUTOSTART, useValue: true }],
})
export class WorkerModule {}
