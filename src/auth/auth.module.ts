import { Module } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import { ScopesGuard } from './scopes.guard';

@Module({
  providers: [JwtAuthGuard, ScopesGuard],
  exports: [JwtAuthGuard, ScopesGuard],
})
export class AuthModule {}