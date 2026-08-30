import { Module } from '@nestjs/common';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { NormaliseModule } from '../normalise/normalise.module';
import { ProfilesRepository } from './profiles.repository';
import { PublicProfileController } from './public-profile.controller';
import { PublicProfileService } from './public-profile.service';

@Module({
  imports: [LinkedInModule, NormaliseModule],
  controllers: [PublicProfileController],
  providers: [ProfilesRepository, PublicProfileService],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
