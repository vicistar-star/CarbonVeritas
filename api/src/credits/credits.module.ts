import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { StellarModule } from '../stellar/stellar.module';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [StellarModule, IpfsModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
