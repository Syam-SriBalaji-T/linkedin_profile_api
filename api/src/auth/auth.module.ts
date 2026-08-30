import { Module } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
