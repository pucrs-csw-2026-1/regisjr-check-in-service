import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

interface QrCodeClaims {
  eventId: string;
  userId: string;
  jti: string;
}

@Injectable()
export class QrCodeTokenService {
  issue(eventId: string, userId: string): { token: string; payload: string; expiresAt: string; jti: string } {
    const secret = process.env.QR_JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Missing QR secret');
    }

    const ttlSeconds = Number(process.env.QR_JWT_TTL_SECONDS ?? 300);
    const jti = randomUUID();
    const token = jwt.sign({ eventId, userId, jti } satisfies QrCodeClaims, secret, {
      algorithm: 'HS256',
      expiresIn: ttlSeconds,
    });

    return {
      token,
      payload: `checkin://${token}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      jti,
    };
  }

  verify(token: string): QrCodeClaims {
    const secret = process.env.QR_JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Missing QR secret');
    }

    const normalizedToken = token.startsWith('checkin://') ? token.slice('checkin://'.length) : token;
    return jwt.verify(normalizedToken, secret, { algorithms: ['HS256'] }) as QrCodeClaims;
  }
}