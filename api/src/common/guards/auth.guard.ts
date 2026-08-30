import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import type { AuthenticatedUser } from '../../auth/auth.types';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.auth.resolveToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    req.user = user;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  if (!value || scheme.toLowerCase() !== 'bearer') return undefined;
  return value.trim() || undefined;
}
