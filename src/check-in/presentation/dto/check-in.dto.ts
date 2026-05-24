import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { CheckInMethod } from '../../domain/check-in.types';

export class GenerateQrCodeResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty()
  qrPayload!: string;

  @ApiProperty()
  expiresAt!: string;
}

export class ScanQrCodeDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  eventId!: string;

  @ApiProperty()
  @IsString()
  scannedBy!: string;
}

export class ManualCheckInDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsString()
  performedBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CheckInDto {
  @ApiProperty()
  checkInId!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  checkedInAt!: string;

  @ApiProperty({ enum: CheckInMethod })
  method!: CheckInMethod;

  @ApiProperty({ nullable: true })
  scannedBy!: string | null;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ nullable: true })
  tokenJti!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class CheckInListResponseDto {
  @ApiProperty({ type: [CheckInDto] })
  data!: CheckInDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class CheckInStatsResponseDto {
  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  totalCheckIns!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byMethod!: Record<string, number>;

  @ApiProperty()
  qrAudits!: number;
}