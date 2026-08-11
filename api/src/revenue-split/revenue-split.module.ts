import { Module } from '@nestjs/common';
import { RevenueSplitController } from './revenue-split.controller';
import { RevenueSplitService } from './revenue-split.service';
import { StellarModule } from '../stellar/stellar.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [StellarModule, AdminModule],
  controllers: [RevenueSplitController],
  providers: [RevenueSplitService],
  exports: [RevenueSplitService],
})
export class RevenueSplitModule {}
