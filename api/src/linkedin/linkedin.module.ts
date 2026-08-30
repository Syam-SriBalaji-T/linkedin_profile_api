import { Module } from '@nestjs/common';
import { HtmlProfileFetcher } from './html-profile.fetcher';
import { LinkedInSessionService } from './linkedin-session.service';
import { ProfileFetcher } from './profile-fetcher';

@Module({
  providers: [
    { provide: ProfileFetcher, useClass: HtmlProfileFetcher },
    LinkedInSessionService,
  ],
  exports: [ProfileFetcher, LinkedInSessionService],
})
export class LinkedInModule {}
