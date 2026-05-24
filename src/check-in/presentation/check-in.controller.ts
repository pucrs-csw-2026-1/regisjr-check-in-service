import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Scopes } from '../../auth/scopes.decorator';
import { ScopesGuard } from '../../auth/scopes.guard';
import { CheckInService } from '../check-in.service';
import {
  CheckInDto,
  CheckInListResponseDto,
  CheckInStatsResponseDto,
  GenerateQrCodeResponseDto,
  ManualCheckInDto,
  ScanQrCodeDto,
} from './dto/check-in.dto';

@ApiTags('Check-ins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopesGuard)
@Controller()
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Get('events/:eventId/guests/:userId/qr-code')
  @Scopes('user', 'admin')
  @ApiOperation({ summary: 'Generate a QR code for a participant' })
  @ApiOkResponse({ type: GenerateQrCodeResponseDto })
  async generateQrCode(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Req() request: any,
  ): Promise<GenerateQrCodeResponseDto> {
    if (request.user?.sub !== userId && !request.user?.scopes?.includes('admin')) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.checkInService.generateQrCode(eventId, userId);
  }

  @Post('check-ins/scan')
  @Scopes('staff', 'organizer', 'admin')
  @ApiOperation({ summary: 'Scan a QR code and persist the check-in' })
  @ApiOkResponse({ type: CheckInDto })
  async scan(@Body() body: ScanQrCodeDto, @Req() request: any): Promise<CheckInDto> {
    return this.checkInService.scan({
      token: body.token,
      eventId: body.eventId,
      scannedBy: request.user?.sub ?? body.scannedBy,
    });
  }

  @Get('events/:eventId/check-ins')
  @Scopes('organizer', 'admin')
  @ApiOperation({ summary: 'List event check-ins' })
  @ApiOkResponse({ type: CheckInListResponseDto })
  async listEventCheckIns(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CheckInListResponseDto> {
    return this.checkInService.listEventCheckIns(eventId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('events/:eventId/check-ins/:userId')
  @Scopes('user', 'organizer', 'admin')
  @ApiOperation({ summary: 'Fetch a specific user check-in for an event' })
  @ApiOkResponse({ type: CheckInDto })
  async getUserCheckIn(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Req() request: any,
  ): Promise<CheckInDto> {
    if (
      request.user?.sub !== userId &&
      !request.user?.scopes?.includes('admin') &&
      !request.user?.scopes?.includes('organizer')
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.checkInService.getUserCheckIn(eventId, userId);
  }

  @Post('events/:eventId/check-ins/manual')
  @Scopes('staff', 'organizer', 'admin')
  @ApiOperation({ summary: 'Perform a manual check-in' })
  @ApiOkResponse({ type: CheckInDto })
  async manualCheckIn(
    @Param('eventId') eventId: string,
    @Body() body: ManualCheckInDto,
    @Req() request: any,
  ): Promise<CheckInDto> {
    return this.checkInService.manualCheckIn(eventId, {
      userId: body.userId,
      performedBy: request.user?.sub ?? body.performedBy,
      reason: body.reason,
    });
  }

  @Get('events/:eventId/check-ins/stats')
  @Scopes('organizer', 'admin')
  @ApiOperation({ summary: 'Get attendance statistics for an event' })
  @ApiOkResponse({ type: CheckInStatsResponseDto })
  async getStats(@Param('eventId') eventId: string): Promise<CheckInStatsResponseDto> {
    return this.checkInService.getStats(eventId);
  }
}