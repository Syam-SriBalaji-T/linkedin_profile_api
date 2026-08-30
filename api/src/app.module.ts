import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import { CorsModule } from './cors/cors.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SearchesModule } from './searches/searches.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CorsModule,
    AuthModule,
    SearchesModule,
    ProfilesModule,
    HealthModule,
  ],
})
export class AppModule {}
