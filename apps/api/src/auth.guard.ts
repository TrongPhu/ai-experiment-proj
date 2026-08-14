import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService, AuthUser, UserRole } from './auth.service';

export const RequiredRole = (role: UserRole) => SetMetadata('role', role);
export const OptionalAuth = () => SetMetadata('optionalAuth', true);

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredRole = this.reflector.get<UserRole>(
      'role',
      context.getHandler(),
    );
    const optionalAuth = this.reflector.get<boolean>(
      'optionalAuth',
      context.getHandler(),
    );

    if (!requiredRole && !optionalAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = optionalAuth
      ? this.extractOptionalBearerToken(request)
      : this.extractBearerToken(request);

    if (!token) {
      return true;
    }

    const user = await this.authService.verifyToken(token);

    if (requiredRole === 'admin' && user.role !== 'admin') {
      throw new UnauthorizedException('Admin role is required.');
    }

    request.user = user;
    return true;
  }

  private extractBearerToken(request: Request) {
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    return header.slice('Bearer '.length).trim();
  }

  private extractOptionalBearerToken(request: Request) {
    const header = request.headers.authorization;

    if (!header) {
      return null;
    }

    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header.');
    }

    return header.slice('Bearer '.length).trim();
  }
}
