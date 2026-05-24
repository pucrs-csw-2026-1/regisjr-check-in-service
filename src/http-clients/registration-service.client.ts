import { Injectable } from '@nestjs/common';

@Injectable()
export class RegistrationServiceClient {
  async validateRegistration(
    eventId: string,
    userId: string,
  ): Promise<{ isRegistered: boolean; isConfirmed: boolean }> {
    void eventId;
    void userId;

    return {
      isRegistered: true,
      isConfirmed: true,
    };
  }
}