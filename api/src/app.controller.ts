import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      version: '1.0.0',
      network: process.env.STELLAR_NETWORK ?? 'testnet',
      timestamp: new Date().toISOString(),
    };
  }
}
