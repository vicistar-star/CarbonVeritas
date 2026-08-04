import { Module } from '@nestjs/common';
import { SorobanClient } from './soroban-client';
import { StellarService } from './stellar.service';

@Module({
  providers: [StellarService, SorobanClient],
  exports: [StellarService, SorobanClient],
})
export class StellarModule {}
