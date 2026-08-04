import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SorobanClient } from '../stellar/soroban-client';
import { MetricsService } from './metrics.service';

export interface HealthCheckResult {
  name: string;
  status: 'ok' | 'error';
  detail?: string;
}

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanClient,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshBusinessMetrics();
  }

  async refreshBusinessMetrics(): Promise<void> {
    try {
      const [credits, retirements, verifiers, offers] = await Promise.all([
        this.prisma.credit.count(),
        this.prisma.retirement.count(),
        this.prisma.verifier.count(),
        this.prisma.offer.count(),
      ]);
      this.metrics.setGauge('carbonveritas_credits_total', credits);
      this.metrics.setGauge('carbonveritas_retirements_total', retirements);
      this.metrics.setGauge('carbonveritas_verifiers_total', verifiers);
      this.metrics.setGauge('carbonveritas_offers_total', offers);
    } catch (error) {
      this.logger.warn(
        `Could not refresh business metrics: ${(error as Error).message}`,
      );
    }
  }

  async checkHealth(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    checks: HealthCheckResult[];
    timestamp: string;
  }> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkNetwork(),
    ]);

    const hasError = checks.some((check) => check.status === 'error');
    const db = checks.find((check) => check.name === 'database');
    const status =
      db?.status === 'error' ? 'down' : hasError ? 'degraded' : 'ok';

    return { status, checks, timestamp: new Date().toISOString() };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      if (typeof this.prisma.$queryRaw === 'function') {
        await this.prisma.$queryRaw`SELECT 1`;
        return { name: 'database', status: 'ok' };
      }
      await this.prisma.credit.count();
      return { name: 'database', status: 'ok' };
    } catch (error) {
      return {
        name: 'database',
        status: 'error',
        detail: (error as Error).message,
      };
    }
  }

  private async checkNetwork(): Promise<HealthCheckResult> {
    if (!this.config.get<string>('CREDIT_REGISTRY_CONTRACT')) {
      return {
        name: 'stellar-network',
        status: 'ok',
        detail: 'not configured',
      };
    }
    try {
      const ledger = await this.soroban.getLatestLedger();
      return {
        name: 'stellar-network',
        status: 'ok',
        detail: `ledger ${ledger.sequence}`,
      };
    } catch (error) {
      return {
        name: 'stellar-network',
        status: 'error',
        detail: (error as Error).message,
      };
    }
  }
}
