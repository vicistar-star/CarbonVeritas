import { Global, Module } from '@nestjs/common';
import { EventEmitterService } from './event-emitter.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Global()
@Module({
  imports: [WebhooksModule],
  providers: [EventEmitterService],
  exports: [EventEmitterService],
})
export class EventEmitterModule {}
