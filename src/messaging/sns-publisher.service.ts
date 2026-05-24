import { Injectable } from '@nestjs/common';

@Injectable()
export class SnsPublisherService {
  async publish(event: unknown): Promise<void> {
    void event;
  }
}