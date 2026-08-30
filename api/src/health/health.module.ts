import { Module } from '@nestjs/common';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [LinkedInModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
