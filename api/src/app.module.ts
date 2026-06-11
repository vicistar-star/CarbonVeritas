import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { StellarModule } from './stellar/stellar.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { PrismaModule } from './prisma/prisma.module';
import { CreditsModule } from './credits/credits.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RetirementModule } from './retirement/retirement.module';
import { VerifiersModule } from './verifiers/verifiers.module';
import { CertificatesModule } from './certificates/certificates.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { EventEmitterModule } from './events/event-emitter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    AuthModule,
    StellarModule,
    IpfsModule,
    CreditsModule,
    MarketplaceModule,
    RetirementModule,
    VerifiersModule,
    CertificatesModule,
    WebhooksModule,
    EventEmitterModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
