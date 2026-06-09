import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { ApproveCreditDto } from './dto/approve-credit.dto';
import { RejectCreditDto } from './dto/reject-credit.dto';
import { CreditFilterDto } from './dto/credit-filter.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Credits')
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List credits with pagination and filters' })
  async findAll(@Query() filters: CreditFilterDto) {
    return this.creditsService.getCredits(filters);
  }

  @ApiBearerAuth()
  @Get('owned')
  @ApiOperation({ summary: 'Get credits owned by the authenticated wallet' })
  async getOwned(@CurrentUser() user: { id: string; wallet: string }) {
    return this.creditsService.getOwnedCredits(user.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get credit by ID with full provenance' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.creditsService.getCredit(id);
  }

  @Public()
  @Get(':id/provenance')
  @ApiOperation({ summary: 'Get complete ownership history for a credit' })
  async getProvenance(@Param('id', ParseIntPipe) id: number) {
    return this.creditsService.getProvenance(id);
  }

  @ApiBearerAuth()
  @Post('issue')
  @ApiOperation({ summary: 'Submit a new carbon credit for verifier approval' })
  async issue(
    @CurrentUser() user: { id: string; wallet: string },
    @Body() dto: CreateCreditDto,
  ) {
    return this.creditsService.issueCredit(user.id, user.wallet, dto);
  }

  @ApiBearerAuth()
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending credit (verifier only)' })
  async approve(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveCreditDto,
  ) {
    return this.creditsService.approveCredit(user.id, user.wallet, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending credit (verifier only)' })
  async reject(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectCreditDto,
  ) {
    return this.creditsService.rejectCredit(user.id, user.wallet, id, dto);
  }
}
