import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';

@ApiTags('Service')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Service info' })
  getInfo() {
    return {
      name: 'carbonveritas-api',
      version: '1.0.0',
      network: process.env.STELLAR_NETWORK ?? 'testnet',
    };
  }
}
