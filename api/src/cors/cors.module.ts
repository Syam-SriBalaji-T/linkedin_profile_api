import { Module } from '@nestjs/common';
import { CorsOriginsRepository } from './cors-origins.repository';
import { CorsService } from './cors.service';

@Module({
  providers: [CorsOriginsRepository, CorsService],
  exports: [CorsService],
})
export class CorsModule {}
