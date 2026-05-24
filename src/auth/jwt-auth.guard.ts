import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

interface AccessTokenPayload {
  sub: string;
  scopes?: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader: string | undefined = request.headers?.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    const secret = process.env.AUTH_JWT_SECRET;

    if (!secret) {
      throw new UnauthorizedException('Missing auth secret');
    }

    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AccessTokenPayload;
      request.user = {
        sub: payload.sub,
        scopes: payload.scopes ?? [],
      };

      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }

      throw new UnauthorizedException('Invalid token');
    }
  }
}