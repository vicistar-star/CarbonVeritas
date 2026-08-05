import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { Scope3QueryDto } from './dto/scope3-query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Readable } from 'stream';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('scope3')
  @ApiOperation({
    summary:
      'Export retired credits as a GHG Protocol Scope 3 inventory report (JSON or CSV)',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv'],
    required: false,
    description: 'Response format (default: json)',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Filter retirements by calendar year',
  })
  async scope3(
    @CurrentUser() user: { id: string; wallet: string },
    @Query() query: Scope3QueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | unknown> {
    const report = await this.reportingService.getScope3Report(
      user.id,
      user.wallet,
      query.year,
    );

    if (query.format === 'csv') {
      const csv = this.reportingService.toScope3Csv(report);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="scope3-${query.year ?? 'all'}.csv"`,
      });
      return new StreamableFile(Readable.from([Buffer.from(csv, 'utf-8')]));
    }

    return report;
  }
}
