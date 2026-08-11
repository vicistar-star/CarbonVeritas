import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RevenueSplitService } from './revenue-split.service';
import {
  ConfigureRevenueSplitDto,
  DistributeRevenueSplitDto,
} from './dto/revenue-split.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { AdminGuard } from '../admin/admin.guard';

@ApiTags('Revenue Split')
@Controller('revenue-split')
export class RevenueSplitController {
  constructor(private readonly revenueSplitService: RevenueSplitService) {}

  @Public()
  @Get(':projectId/config')
  @ApiOperation({
    summary: 'Get the revenue-split configuration for a project',
  })
  async getConfig(@Param('projectId') projectId: string) {
    return this.revenueSplitService.getConfig(projectId);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Post(':projectId/config')
  @ApiOperation({
    summary: 'Configure revenue-split beneficiaries for a project (admin only)',
  })
  async configure(
    @Param('projectId') projectId: string,
    @Body() dto: ConfigureRevenueSplitDto,
    @CurrentUser() user: { id: string; wallet: string },
  ) {
    return this.revenueSplitService.configure(user.wallet, projectId, dto);
  }

  @ApiBearerAuth()
  @Post(':projectId/distribute')
  @ApiOperation({
    summary:
      'Distribute a payment among a project\u2019s configured beneficiaries',
  })
  async distribute(
    @Param('projectId') projectId: string,
    @Body() dto: DistributeRevenueSplitDto,
    @CurrentUser() user: { id: string; wallet: string },
  ) {
    return this.revenueSplitService.distribute(user.wallet, projectId, dto);
  }
}
