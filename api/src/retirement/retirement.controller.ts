import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RetirementService } from './retirement.service';
import { RetireCreditDto } from './dto/retire-credit.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Retirement')
@Controller('credits')
export class RetirementController {
  constructor(private readonly retirementService: RetirementService) {}

  @ApiBearerAuth()
  @Post(':id/retire')
  @ApiOperation({ summary: 'Retire a carbon credit' })
  async retire(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RetireCreditDto,
  ) {
    return this.retirementService.retireCredit(user.id, user.wallet, id, dto);
  }

  @Public()
  @Get(':id/certificate')
  @ApiOperation({ summary: 'Get retirement certificate data for a credit' })
  async getCertificate(@Param('id', ParseIntPipe) id: number) {
    return this.retirementService.getCertificate(id);
  }
}
