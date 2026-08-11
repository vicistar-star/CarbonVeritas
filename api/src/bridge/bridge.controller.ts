import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BridgeService } from './bridge.service';
import { BridgeInDto } from './dto/bridge-in.dto';
import { BridgeFilterDto } from './dto/bridge-filter.dto';
import { UpdateRegistryRootDto } from './dto/registry-root.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { AdminGuard } from '../admin/admin.guard';

@ApiTags('Bridge')
@Controller('bridge')
export class BridgeController {
  constructor(private readonly bridgeService: BridgeService) {}

  @Public()
  @Get('records')
  @ApiOperation({
    summary:
      'List the public bridge audit ledger (credits imported/exported across registries)',
  })
  async getRecords(@Query() filters: BridgeFilterDto) {
    return this.bridgeService.getRecords(filters);
  }

  @Public()
  @Get('registries/:registry/root')
  @ApiOperation({
    summary: 'Get the published merkle root for a legacy registry',
  })
  async getRegistryRoot(@Param('registry') registry: string) {
    return this.bridgeService.getRegistryRoot(registry);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Post('registries/:registry/root')
  @ApiOperation({
    summary:
      'Publish a new merkle root for a legacy registry (admin only)',
  })
  async updateRegistryRoot(
    @Param('registry') registry: string,
    @Body() dto: UpdateRegistryRootDto,
    @CurrentUser() user: { id: string; wallet: string },
  ) {
    return this.bridgeService.updateRegistryRoot(user.wallet, registry, dto);
  }

  @ApiBearerAuth()
  @Post('in')
  @ApiOperation({
    summary:
      'Bridge a credit from a legacy registry onto Stellar using a Merkle inclusion proof',
  })
  async bridgeIn(
    @CurrentUser() user: { id: string; wallet: string },
    @Body() dto: BridgeInDto,
  ) {
    return this.bridgeService.bridgeIn(user.id, user.wallet, dto);
  }

  @ApiBearerAuth()
  @Post('credits/:creditId/out')
  @ApiOperation({
    summary:
      'Bridge a previously imported credit back to its source registry for retirement there',
  })
  async bridgeOut(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('creditId', ParseIntPipe) creditId: number,
  ) {
    return this.bridgeService.bridgeOut(user.id, user.wallet, creditId);
  }
}
