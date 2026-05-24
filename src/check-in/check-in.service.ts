import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { RegistrationServiceClient } from '../http-clients/registration-service.client';
import { SnsPublisherService } from '../messaging/sns-publisher.service';
import { CheckInMethod, CheckInRecord, QrCodeAuditRecord } from './domain/check-in.types';
import { QrCodeTokenService } from './infrastructure/jwt/qr-code-token.service';

export interface GenerateQrCodeResponse {
  token: string;
  qrPayload: string;
  expiresAt: string;
}

export interface CheckInResponse {
  checkInId: string;
  eventId: string;
  userId: string;
  checkedInAt: string;
  method: CheckInMethod;
  scannedBy: string | null;
  reason: string | null;
  tokenJti: string | null;
  createdAt: string;
}

export interface CheckInListResponse {
  data: CheckInResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CheckInStatsResponse {
  eventId: string;
  totalCheckIns: number;
  byMethod: Record<string, number>;
  qrAudits: number;
}

interface ScanPayload {
  token: string;
  eventId: string;
  scannedBy: string;
}

interface ManualCheckInPayload {
  userId: string;
  performedBy: string;
  reason?: string;
}

@Injectable()
export class CheckInService {
  private readonly checkInsByEvent = new Map<string, Map<string, CheckInRecord>>();
  private readonly qrAuditsByEvent = new Map<string, QrCodeAuditRecord[]>();

  constructor(
    private readonly qrCodeTokenService: QrCodeTokenService,
    private readonly registrationServiceClient: RegistrationServiceClient,
    private readonly snsPublisherService: SnsPublisherService,
  ) {}

  async generateQrCode(eventId: string, userId: string): Promise<GenerateQrCodeResponse> {
    await this.registrationServiceClient.validateRegistration(eventId, userId);

    const issued = this.qrCodeTokenService.issue(eventId, userId);
    const audit: QrCodeAuditRecord = {
      eventId,
      userId,
      tokenJti: issued.jti,
      issuedAt: new Date().toISOString(),
      expiresAt: issued.expiresAt,
    };

    const currentAudits = this.qrAuditsByEvent.get(eventId) ?? [];
    currentAudits.push(audit);
    this.qrAuditsByEvent.set(eventId, currentAudits);

    return {
      token: issued.token,
      qrPayload: issued.payload,
      expiresAt: issued.expiresAt,
    };
  }

  async scan(payload: ScanPayload): Promise<CheckInResponse> {
    const tokenClaims = this.qrCodeTokenService.verify(payload.token);
    await this.registrationServiceClient.validateRegistration(payload.eventId, tokenClaims.userId);

    return this.persistCheckIn({
      eventId: payload.eventId,
      userId: tokenClaims.userId,
      method: CheckInMethod.QrCode,
      scannedBy: payload.scannedBy,
      reason: null,
      tokenJti: tokenClaims.jti,
    });
  }

  async manualCheckIn(eventId: string, payload: ManualCheckInPayload): Promise<CheckInResponse> {
    await this.registrationServiceClient.validateRegistration(eventId, payload.userId);

    return this.persistCheckIn({
      eventId,
      userId: payload.userId,
      method: CheckInMethod.Manual,
      scannedBy: payload.performedBy,
      reason: payload.reason ?? null,
      tokenJti: null,
    });
  }

  async listEventCheckIns(eventId: string, page = 1, limit = 20): Promise<CheckInListResponse> {
    const records = this.getEventRecords(eventId);
    const start = (page - 1) * limit;

    return {
      data: records.slice(start, start + limit),
      total: records.length,
      page,
      limit,
    };
  }

  async getUserCheckIn(eventId: string, userId: string): Promise<CheckInResponse> {
    const record = this.getEventRecords(eventId).find((item) => item.userId === userId);

    if (!record) {
      throw new NotFoundException('Check-in not found');
    }

    return record;
  }

  async getStats(eventId: string): Promise<CheckInStatsResponse> {
    const records = this.getEventRecords(eventId);
    const audits = this.qrAuditsByEvent.get(eventId) ?? [];

    return {
      eventId,
      totalCheckIns: records.length,
      byMethod: records.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.method] = (accumulator[item.method] ?? 0) + 1;
        return accumulator;
      }, {}),
      qrAudits: audits.length,
    };
  }

  private persistCheckIn(input: {
    eventId: string;
    userId: string;
    method: CheckInMethod;
    scannedBy: string;
    reason: string | null;
    tokenJti: string | null;
  }): CheckInResponse {
    const now = new Date().toISOString();
    const eventRecords = this.checkInsByEvent.get(input.eventId) ?? new Map<string, CheckInRecord>();

    if (eventRecords.has(input.userId)) {
      return eventRecords.get(input.userId) as CheckInResponse;
    }

    const record: CheckInRecord = {
      checkInId: randomUUID(),
      eventId: input.eventId,
      userId: input.userId,
      checkedInAt: now,
      method: input.method,
      scannedBy: input.scannedBy,
      reason: input.reason,
      tokenJti: input.tokenJti,
      createdAt: now,
    };

    eventRecords.set(input.userId, record);
    this.checkInsByEvent.set(input.eventId, eventRecords);
    void this.snsPublisherService.publish({
      eventType: 'CheckInCompleted',
      version: '1.0',
      occurredAt: now,
      data: {
        checkInId: record.checkInId,
        eventId: record.eventId,
        userId: record.userId,
        checkedInAt: record.checkedInAt,
        method: record.method,
        scannedBy: record.scannedBy,
      },
    });

    return record;
  }

  private getEventRecords(eventId: string): CheckInResponse[] {
    return [...(this.checkInsByEvent.get(eventId)?.values() ?? [])];
  }
}