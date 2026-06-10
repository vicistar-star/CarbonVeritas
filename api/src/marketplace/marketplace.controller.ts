import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { MarketplaceFilterDto } from './dto/marketplace-filter.dto';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @ApiBearerAuth()
  @Post('offer')
  @ApiOperation({ summary: 'Create a sell offer' })
  async createOffer(
    @CurrentUser() user: { id: string; wallet: string },
    @Body() dto: CreateOfferDto,
  ) {
    return this.marketplaceService.createOffer(user.id, user.wallet, dto);
  }

  @ApiBearerAuth()
  @Post('buy/:id')
  @ApiOperation({ summary: 'Execute a purchase from an offer' })
  async buyCredits(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id', ParseIntPipe) id: number,
    @Body('amount') amount: number,
  ) {
    return this.marketplaceService.buyCredits(user.id, user.wallet, id, amount);
  }

  @ApiBearerAuth()
  @Delete('offer/:id')
  @ApiOperation({ summary: 'Cancel a sell offer' })
  async cancelOffer(
    @CurrentUser() user: { id: string; wallet: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.marketplaceService.cancelOffer(user.id, id);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List active offers with filters and pagination' })
  async getListings(@Query() filters: MarketplaceFilterDto) {
    return this.marketplaceService.getListings(filters);
  }

  @ApiBearerAuth()
  @Get('history')
  @ApiOperation({ summary: 'Get authenticated user trade history' })
  async getHistory(@CurrentUser() user: { id: string; wallet: string }) {
    return this.marketplaceService.getTradeHistory(user.id);
  }

  @Get('price-history')
  @ApiOperation({ summary: 'Get time-series price history' })
  async getPriceHistory() {
    return this.marketplaceService.getPriceHistory();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace stats (volume, VWAP, open interest)' })
  async getStats() {
    return this.marketplaceService.getStats();
  }
}
