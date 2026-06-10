import { Module } from '@nestjs/common';
import { VerifiersController } from './verifiers.controller';
import { VerifiersService } from './verifiers.service';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [StellarModule],
  controllers: [VerifiersController],
  providers: [VerifiersService],
  exports: [VerifiersService],
})
export class VerifiersModule {}
