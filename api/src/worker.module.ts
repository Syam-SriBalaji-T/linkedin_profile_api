import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { JobRunnerService } from './jobs/job-runner.service';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, JobsModule],
  providers: [JobRunnerService],
})
export class WorkerModule {}
