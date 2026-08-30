import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import type { AuthenticatedUser, PublicUser } from './auth.types';
import { hashPassword, verifyPassword } from './password.util';
import { generateSessionToken, hashSessionToken } from './token.util';
import { UsersRepository } from './users.repository';

export interface LoginResult {
  token: string;
  expires_at: Date;
  user: PublicUser;
}

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly config: AppConfig,
  ) {}

  async register(email: string, password: string): Promise<LoginResult> {
    const passwordHash = await hashPassword(password);

    try {
      const user = await this.users.create(email, passwordHash);
      this.logger.log(`Registered user ${user.id}`);
      return this.issueSession(user.id, user.email, user.created_at);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('An account with that email already exists');
      }
      throw err;
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);

    // Hash even when the user is absent, so login timing does not leak existence.
    const storedHash = user?.password_hash ?? DUMMY_HASH;
    const ok = await verifyPassword(password, storedHash);

    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSession(user.id, user.email, user.created_at);
  }

  async logout(userId: string): Promise<void> {
    await this.users.clearSession(userId);
  }

  async resolveToken(token: string): Promise<AuthenticatedUser | undefined> {
    const user = await this.users.findByLiveSessionToken(hashSessionToken(token));
    if (!user) return undefined;
    return { id: user.id, email: user.email };
  }

  async me(userId: string): Promise<PublicUser | undefined> {
    const user = await this.users.findById(userId);
    return user ? { id: user.id, email: user.email, created_at: user.created_at } : undefined;
  }

  private async issueSession(
    userId: string,
    email: string,
    createdAt: Date,
  ): Promise<LoginResult> {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + this.config.sessionTtlHours * 3_600_000);

    // One session per user: this overwrites any existing token, so a new login
    // signs the account out everywhere else.
    await this.users.setSession(userId, hashSessionToken(token), expiresAt);

    return {
      token,
      expires_at: expiresAt,
      user: { id: userId, email, created_at: createdAt },
    };
  }
}

const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
