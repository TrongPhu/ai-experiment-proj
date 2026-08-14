import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from './database.service';

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

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
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

    return {
      accessToken: this.signToken(user),
      user,
    };
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

    return {
      accessToken: this.signToken(publicUser),
      user: publicUser,
    };
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

    return {
      accessToken: this.signToken(publicUser),
      user: publicUser,
    };
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

  private toPublicUser(user: UserRow): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
