import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { HealthService } from './health.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { ObservabilityController } from './observability.controller';

@Module({
  imports: [StellarModule],
  controllers: [ObservabilityController],
  providers: [HealthService, MetricsService, MetricsInterceptor],
  exports: [MetricsService],
})
export class ObservabilityModule {}
