import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

@ApiTags('Observability')
@Controller()
export class ObservabilityController {
  constructor(
    private readonly health: HealthService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Deep health check across DB and RPC' })
  getHealth() {
    return this.health.checkHealth();
  }

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics' })
  getMetrics(): string {
    return this.metrics.renderPrometheus();
  }
}
