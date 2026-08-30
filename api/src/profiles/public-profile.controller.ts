import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PublicProfileService } from './public-profile.service';

/**
 * The graded endpoint: GET /profile?url=<linkedin profile url>
 * Public and synchronous — no auth, returns structured JSON.
 */
@Controller('profile')
export class PublicProfileController {
  constructor(private readonly service: PublicProfileService) {}

  @Get()
  getProfile(@Query('url') url?: string, @Query('refresh') refresh?: string) {
    if (!url || !url.trim()) {
      throw new BadRequestException('Query parameter "url" is required (a LinkedIn profile URL)');
    }
    return this.service.getProfile(url.trim(), refresh === 'true');
  }
}
