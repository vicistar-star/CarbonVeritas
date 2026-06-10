import { Module } from '@nestjs/common';
import { RetirementController } from './retirement.controller';
import { RetirementService } from './retirement.service';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [StellarModule],
  controllers: [RetirementController],
  providers: [RetirementService],
  exports: [RetirementService],
})
export class RetirementModule {}
