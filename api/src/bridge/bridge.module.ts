import { Module } from '@nestjs/common';
import { BridgeController } from './bridge.controller';
import { BridgeService } from './bridge.service';
import { StellarModule } from '../stellar/stellar.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [StellarModule, AdminModule],
  controllers: [BridgeController],
  providers: [BridgeService],
  exports: [BridgeService],
})
export class BridgeModule {}
