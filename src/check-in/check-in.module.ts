import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DynamoDbService } from '../database/dynamo-db.service';
import { RegistrationServiceClient } from '../http-clients/registration-service.client';
import { SnsPublisherService } from '../messaging/sns-publisher.service';
import { CheckInService } from './check-in.service';
import { QrCodeTokenService } from './infrastructure/jwt/qr-code-token.service';
import { CheckInController } from './presentation/check-in.controller';

@Module({
  imports: [AuthModule],
  controllers: [CheckInController],
  providers: [
    CheckInService,
    QrCodeTokenService,
    RegistrationServiceClient,
    DynamoDbService,
    SnsPublisherService,
  ],
  exports: [CheckInService],
})
export class CheckInModule {}