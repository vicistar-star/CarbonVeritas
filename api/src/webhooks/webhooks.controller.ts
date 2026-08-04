import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiBearerAuth()
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  async register(
    @CurrentUser() user: { id: string; wallet: string },
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhooksService.register(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List registered webhooks' })
  async list(@CurrentUser() user: { id: string; wallet: string }) {
    return this.webhooksService.list(user.id);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List webhook delivery attempts for the user' })
  async deliveries(
    @CurrentUser() user: { id: string; wallet: string },
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.webhooksService.listDeliveries(user.id, {
      eventType,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a webhook' })
  async remove(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id') id: string,
  ) {
    return this.webhooksService.remove(user.id, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test payload to a webhook' })
  async test(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id') id: string,
  ) {
    return this.webhooksService.sendTest(user.id, id);
  }
}
