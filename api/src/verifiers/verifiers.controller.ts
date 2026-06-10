import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VerifiersService } from './verifiers.service';
import { RegisterVerifierDto } from './dto/register-verifier.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Verifiers')
@Controller('verifiers')
export class VerifiersController {
  constructor(private readonly verifiersService: VerifiersService) {}

  @ApiBearerAuth()
  @Post('register')
  @ApiOperation({ summary: 'Register as a verifier with stake' })
  async register(
    @CurrentUser() user: { id: string; wallet: string },
    @Body() dto: RegisterVerifierDto,
  ) {
    return this.verifiersService.register(user.id, user.wallet, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all verifiers' })
  async findAll() {
    return this.verifiersService.findAll();
  }

  @Public()
  @Get('pending')
  @ApiOperation({ summary: 'List credits pending verifier review' })
  async getPendingCredits() {
    return this.verifiersService.getPendingCredits();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get verifier profile and reputation' })
  async findOne(@Param('id') id: string) {
    return this.verifiersService.findOne(id);
  }

  @Public()
  @Get(':id/approvals')
  @ApiOperation({ summary: 'Get historical approval decisions for a verifier' })
  async getApprovals(@Param('id') id: string) {
    return this.verifiersService.getApprovals(id);
  }

  @ApiBearerAuth()
  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Verifier liveness heartbeat' })
  async heartbeat(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id') id: string,
  ) {
    return this.verifiersService.heartbeat(id);
  }
}
