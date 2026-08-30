import { Module } from '@nestjs/common';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { NormaliseModule } from '../normalise/normalise.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { JobProcessorService } from './job-processor.service';
import { JobsRepository } from './jobs.repository';

@Module({
  imports: [LinkedInModule, NormaliseModule, ProfilesModule],
  providers: [JobsRepository, JobProcessorService],
  exports: [JobsRepository, JobProcessorService],
})
export class JobsModule {}
