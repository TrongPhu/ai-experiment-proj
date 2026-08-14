import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../database/database.service';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface RegisterUserDto {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface PublicRegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface GoogleLoginDto {
  credential: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

interface RefreshTokenRow extends RowDataPacket {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly jwtSecret =
    process.env.JWT_SECRET ?? 'local-dev-secret-change-me';
  private readonly jwtExpiresIn = (process.env.JWT_EXPIRES_IN ??
    '7d') as SignOptions['expiresIn'];
  private readonly refreshTokenExpiresDays = Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30,
  );
  private readonly googleClientId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  private readonly googleClient = new OAuth2Client(this.googleClientId);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    await this.bootstrapAdmin();
  }

  async register(request: RegisterUserDto, actor?: AuthUser) {
    const email = this.normalizeEmail(request.email);
    const name = request.name?.trim();
    const password = request.password ?? '';
    const role = request.role ?? 'user';

    if (!name) {
      throw new BadRequestException('name is required.');
    }

    if (password.length < 8) {
      throw new BadRequestException('password must contain at least 8 chars.');
    }

    if (role === 'admin' && actor?.role !== 'admin') {
      throw new UnauthorizedException('Only admins can create admin users.');
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new BadRequestException('email already exists.');
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    await this.database.execute(
      `
        INSERT INTO users (id, email, name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, email, name, passwordHash, role],
    );

    const user = await this.findById(id);
    if (!user) {
      throw new BadRequestException('Unable to create user.');
    }

    return this.toPublicUser(user);
  }

  async registerPublic(request: PublicRegisterDto) {
    const user = await this.register({ ...request, role: 'user' });

    return this.createSession(user);
  }

  async login(request: LoginDto) {
    const email = this.normalizeEmail(request.email);
    const user = await this.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isValid = await bcrypt.compare(
      request.password ?? '',
      user.password_hash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const publicUser = this.toPublicUser(user);

    return this.createSession(publicUser);
  }

  async loginWithGoogle(request: GoogleLoginDto) {
    if (!this.googleClientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured.');
    }

    if (!request.credential) {
      throw new BadRequestException('Google credential is required.');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: request.credential,
      audience: this.googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google email is not verified.');
    }

    const email = this.normalizeEmail(payload.email);
    const name = payload.name?.trim() || email.split('@')[0];
    let user = await this.findByEmail(email);

    if (!user) {
      const id = randomUUID();
      const passwordHash = await bcrypt.hash(randomUUID(), 12);

      await this.database.execute(
        `
          INSERT INTO users (id, email, name, password_hash, role)
          VALUES (?, ?, ?, ?, 'user')
        `,
        [id, email, name, passwordHash],
      );

      user = await this.findById(id);
    }

    if (!user) {
      throw new BadRequestException('Unable to create Google user.');
    }

    const publicUser = this.toPublicUser(user);

    return this.createSession(publicUser);
  }

  async refreshSession(request: RefreshTokenDto) {
    const token = request.refreshToken?.trim();

    if (!token) {
      throw new BadRequestException('refreshToken is required.');
    }

    const rows = await this.database.query<RefreshTokenRow[]>(
      `
        SELECT id, user_id, token_hash, expires_at, revoked_at
        FROM auth_refresh_tokens
        WHERE token_hash = ?
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP(3)
        LIMIT 1
      `,
      [this.hashToken(token)],
    );
    const refreshToken = rows[0];

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.findById(refreshToken.user_id);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    await this.revokeRefreshTokenById(refreshToken.id);
    return this.createSession(this.toPublicUser(user));
  }

  async logout(user: AuthUser, refreshToken?: string) {
    if (refreshToken?.trim()) {
      await this.database.execute(
        `
          UPDATE auth_refresh_tokens
          SET revoked_at = CURRENT_TIMESTAMP(3)
          WHERE user_id = ? AND token_hash = ? AND revoked_at IS NULL
        `,
        [user.id, this.hashToken(refreshToken)],
      );
      return { ok: true };
    }

    await this.database.execute(
      `
        UPDATE auth_refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ? AND revoked_at IS NULL
      `,
      [user.id],
    );

    return { ok: true };
  }

  async changePassword(user: AuthUser, request: ChangePasswordDto) {
    const currentPassword = request.currentPassword ?? '';
    const newPassword = request.newPassword ?? '';

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'newPassword must contain at least 8 chars.',
      );
    }

    const row = await this.findById(user.id);
    if (!row) {
      throw new UnauthorizedException('User not found.');
    }

    const isValid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is invalid.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.database.execute(
      `
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
      `,
      [passwordHash, user.id],
    );
    await this.logout(user);

    return { ok: true };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      const user = await this.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      return this.toPublicUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  async listUsers() {
    const rows = await this.database.query<UserRow[]>(`
      SELECT id, email, name, password_hash, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return rows.map((row) => this.toPublicUser(row));
  }

  private async bootstrapAdmin() {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';
    const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Admin';

    if (!email || !password) {
      return;
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      return;
    }

    await this.register(
      {
        email,
        name,
        password,
        role: 'admin',
      },
      { id: 'system', email: 'system', name: 'System', role: 'admin' },
    );
  }

  private async findByEmail(email: string) {
    const rows = await this.database.query<UserRow[]>(
      `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email],
    );

    return rows[0] ?? null;
  }

  private async findById(id: string) {
    const rows = await this.database.query<UserRow[]>(
      `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ?? null;
  }

  private normalizeEmail(email: string) {
    const normalized = email?.trim().toLowerCase();

    if (!normalized || !normalized.includes('@')) {
      throw new BadRequestException('valid email is required.');
    }

    return normalized;
  }

  private signToken(user: AuthUser) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn },
    );
  }

  private async createSession(user: AuthUser) {
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.refreshTokenExpiresDays * 24 * 60 * 60 * 1000,
    );

    await this.database.execute(
      `
        INSERT INTO auth_refresh_tokens
          (id, user_id, token_hash, expires_at)
        VALUES
          (?, ?, ?, ?)
      `,
      [randomUUID(), user.id, this.hashToken(refreshToken), expiresAt],
    );

    return {
      accessToken: this.signToken(user),
      refreshToken,
      user,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeRefreshTokenById(id: string) {
    await this.database.execute(
      `
        UPDATE auth_refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND revoked_at IS NULL
      `,
      [id],
    );
  }

  private toPublicUser(user: UserRow): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
