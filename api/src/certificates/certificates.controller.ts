import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { VerifyCertificateDto } from './dto/verify-certificate.dto';
import { BatchCertificateDto } from './dto/batch-certificate.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify a certificate hash against on-chain record' })
  async verify(@Body() dto: VerifyCertificateDto) {
    return this.certificatesService.verify(dto);
  }

  @ApiBearerAuth()
  @Post('batch')
  @ApiOperation({ summary: 'Queue bulk certificate generation' })
  async batch(
    @CurrentUser() user: { id: string; wallet: string },
    @Body() dto: BatchCertificateDto,
  ) {
    return this.certificatesService.enqueueBatch(user.id, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get certificate metadata (JSON)' })
  async getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }

  @Public()
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stream signed PDF certificate' })
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const streamable = await this.certificatesService.getCertificatePdf(id);
    streamable.getStream().pipe(res);
  }

  @ApiBearerAuth()
  @Get('owned')
  @ApiOperation({ summary: 'Get all certificates for authenticated wallet' })
  async getOwned(@CurrentUser() user: { id: string; wallet: string }) {
    return this.certificatesService.getOwnedCertificates(user.id);
  }
}
