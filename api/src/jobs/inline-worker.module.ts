import { Module } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { JobRunnerService, WORKER_AUTOSTART } from './job-runner.service';
import { JobsModule } from './jobs.module';

/**
 * Lets the API process optionally run the job worker loop in-process, driven by
 * RUN_WORKER_IN_API. Convenient for local dev and single-process deploys.
 */
@Module({
  imports: [JobsModule],
  providers: [
    JobRunnerService,
    {
      provide: WORKER_AUTOSTART,
      useFactory: (config: AppConfig) => config.runWorkerInApi,
      inject: [AppConfig],
    },
  ],
})
export class InlineWorkerModule {}
