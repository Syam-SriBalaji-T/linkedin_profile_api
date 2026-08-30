import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { JobProcessorService } from './job-processor.service';
import { JobsRepository } from './jobs.repository';

@Injectable()
export class JobRunnerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(JobRunnerService.name);
  private stopping = false;
  private loops: Promise<void>[] = [];
  private reaperTimer?: NodeJS.Timeout;

  constructor(
    private readonly jobs: JobsRepository,
    private readonly processor: JobProcessorService,
    private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    const concurrency = Math.max(1, this.config.workerConcurrency);
    this.logger.log(`Starting ${concurrency} worker loop(s)`);

    for (let i = 0; i < concurrency; i += 1) {
      this.loops.push(this.loop(i));
    }

    this.startReaper();
  }

  private async loop(index: number): Promise<void> {
    const idleDelay = this.config.workerPollIntervalMs;

    while (!this.stopping) {
      let claimed = false;
      try {
        const job = await this.jobs.claimNext();
        if (job) {
          claimed = true;
          await this.processor.process(job);
        }
      } catch (err) {
        this.logger.error(
          `Worker loop ${index} error: ${err instanceof Error ? err.message : String(err)}`,
        );
        await sleep(idleDelay);
        continue;
      }

      if (!claimed) await sleep(idleDelay);
    }

    this.logger.log(`Worker loop ${index} stopped`);
  }

  private startReaper(): void {
    const interval = Math.max(30_000, this.config.jobStuckAfterMs);

    const tick = async (): Promise<void> => {
      try {
        const n = await this.jobs.reapStuck(
          this.config.jobStuckAfterMs,
          this.config.jobMaxAttempts,
        );
        if (n > 0) this.logger.warn(`Reaper reclaimed ${n} stuck job(s)`);
      } catch (err) {
        this.logger.error(
          `Reaper error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };

    this.reaperTimer = setInterval(() => void tick(), interval);
    this.reaperTimer.unref();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    if (this.reaperTimer) clearInterval(this.reaperTimer);
    await Promise.allSettled(this.loops);
    this.logger.log('All worker loops drained.');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
