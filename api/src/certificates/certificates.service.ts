import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { VerifyCertificateDto } from './dto/verify-certificate.dto';
import { BatchCertificateDto } from './dto/batch-certificate.dto';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
    private readonly config: ConfigService,
  ) {}

  async verify(dto: VerifyCertificateDto) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { certificateHash: dto.certificateHash },
      include: {
        user: { select: { stellarPub: true } },
      },
    });

    if (!certificate) {
      return {
        valid: false,
        message: 'Certificate not found in registry',
      };
    }

    const retirement = await this.prisma.retirement.findFirst({
      where: { certificateHash: dto.certificateHash },
      include: {
        credit: {
          select: { creditId: true, projectId: true, methodology: true },
        },
      },
    });

    if (!retirement) {
      return {
        valid: false,
        message: 'No matching retirement record found for certificate',
      };
    }

    const onChainHash = await this.stellar.getCertificateHash(
      retirement.credit.creditId,
    );

    const valid = onChainHash === dto.certificateHash;

    return {
      valid,
      message: valid
        ? 'Certificate verified successfully on-chain'
        : 'Certificate hash does not match on-chain record',
      certificate: {
        id: certificate.id,
        createdAt: certificate.createdAt,
        owner: certificate.user.stellarPub,
      },
      retirement: {
        creditId: retirement.credit.creditId,
        projectId: retirement.credit.projectId,
        tonnesRetired: retirement.tonnesRetired,
        beneficiary: retirement.beneficiary,
        timestamp: retirement.timestamp,
        txHash: retirement.txHash,
      },
    };
  }

  async getCertificate(certificateId: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: { select: { id: true, stellarPub: true } },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    const retirement = await this.prisma.retirement.findFirst({
      where: { certificateHash: certificate.certificateHash ?? undefined },
      include: {
        credit: {
          select: {
            creditId: true,
            projectId: true,
            methodology: true,
            geography: true,
            vintageStart: true,
            vintageEnd: true,
            tonnes: true,
            serialPrefix: true,
          },
        },
      },
    });

    return {
      id: certificate.id,
      certificateHash: certificate.certificateHash,
      txHash: certificate.txHash,
      metadata: certificate.metadata,
      pdfUrl: certificate.pdfUrl,
      createdAt: certificate.createdAt,
      owner: certificate.user.stellarPub,
      retirement: retirement
        ? {
            beneficiary: retirement.beneficiary,
            reason: retirement.reason,
            tonnesRetired: retirement.tonnesRetired,
            timestamp: retirement.timestamp,
            txHash: retirement.txHash,
            credit: retirement.credit,
          }
        : null,
    };
  }

  async getCertificatePdf(certificateId: string): Promise<StreamableFile> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    const pdfBuffer = await this.generatePdf(certificate);

    const stream = Readable.from([pdfBuffer]);

    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="certificate-${certificateId}.pdf"`,
    });
  }

  async getOwnedCertificates(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { stellarPub: true } },
      },
    });

    return certificates.map((c) => ({
      id: c.id,
      certificateHash: c.certificateHash,
      txHash: c.txHash,
      metadata: c.metadata,
      pdfUrl: c.pdfUrl,
      createdAt: c.createdAt,
    }));
  }

  async enqueueBatch(userId: string, dto: BatchCertificateDto) {
    const credits = await this.prisma.credit.findMany({
      where: {
        creditId: { in: dto.creditIds },
        status: 'RETIRED',
      },
      include: {
        retirements: {
          where: { retiredById: userId },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (credits.length === 0) {
      throw new BadRequestException('No eligible retired credits found');
    }

    const results: Array<Record<string, unknown>> = [];

    for (const credit of credits) {
      if (credit.retirements.length === 0) continue;

      const retirement = credit.retirements[0];
      const certificateHash = this.generateCertificateHash(credit, retirement);

      const existing = await this.prisma.certificate.findFirst({
        where: { certificateHash },
      });

      if (existing) {
        results.push({
          creditId: credit.creditId,
          status: 'existing',
          certificateId: existing.id,
        });
        continue;
      }

      const certificate = await this.prisma.certificate.create({
        data: {
          userId,
          creditId: credit.id,
          txHash: retirement.txHash,
          metadata: {
            creditId: credit.creditId,
            projectId: credit.projectId,
            methodology: credit.methodology,
            geography: credit.geography,
            vintageStart: credit.vintageStart,
            vintageEnd: credit.vintageEnd,
            tonnes: credit.tonnes,
            serialPrefix: credit.serialPrefix,
            beneficiary: retirement.beneficiary,
            reason: retirement.reason,
            accountingPeriod: retirement.accountingPeriod,
            tonnesRetired: retirement.tonnesRetired,
            retirementDate: retirement.timestamp,
          },
          certificateHash,
        },
      });

      await this.prisma.retirement.update({
        where: { id: retirement.id },
        data: { certificateHash },
      });

      this.logger.log(
        `Certificate generated: id=${certificate.id}, creditId=${credit.creditId}`,
      );

      results.push({
        creditId: credit.creditId,
        status: 'generated',
        certificateId: certificate.id,
        certificateHash,
      });
    }

    return {
      total: credits.length,
      generated: results.filter((r) => r.status === 'generated').length,
      existing: results.filter((r) => r.status === 'existing').length,
      results,
    };
  }

  async generatePdf(
    certificate: Record<string, unknown>,
  ): Promise<Buffer> {
    try {
      const Handlebars = await this.loadHandlebars();
      const templateSource = this.getTemplate();
      const template = Handlebars.compile(templateSource);

      const metadata = certificate.metadata as Record<string, unknown> | null;
      const qrDataUri = await this.generateQrDataUri(
        (certificate.certificateHash as string) ?? '',
      );

      const html = template({
        certificateId: certificate.id as string,
        beneficiary: metadata?.beneficiary ?? '',
        reason: metadata?.reason ?? '',
        accountingPeriod: metadata?.accountingPeriod ?? '',
        tonnesRetired: metadata?.tonnesRetired ?? 0,
        retirementDate: metadata?.retirementDate
          ? new Date(metadata.retirementDate as string).toISOString().split('T')[0]
          : '',
        projectId: metadata?.projectId ?? '',
        methodology: metadata?.methodology ?? '',
        geography: metadata?.geography ?? '',
        vintageStart: metadata?.vintageStart
          ? new Date(metadata.vintageStart as string).toISOString().split('T')[0]
          : '',
        vintageEnd: metadata?.vintageEnd
          ? new Date(metadata.vintageEnd as string).toISOString().split('T')[0]
          : '',
        totalTonnes: metadata?.tonnes ?? 0,
        serialPrefix: metadata?.serialPrefix ?? '',
        txHash: certificate.txHash as string ?? '',
        ledgerSequence: metadata?.ledgerSequence ?? 0,
        certificateHash: certificate.certificateHash as string ?? '',
        qrCodeDataUri: qrDataUri,
      });

      const puppeteer = await this.loadPuppeteer();
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (err) {
      this.logger.warn(
        `PDF generation unavailable, returning placeholder: ${(err as Error).message}`,
      );
      return Buffer.from(
        JSON.stringify(certificate, null, 2),
        'utf-8',
      );
    }
  }

  private generateCertificateHash(
    credit: { creditId: number; projectId: string; tonnes: number },
    retirement: { beneficiary: string; reason: string; timestamp: Date },
  ): string {
    const payload = `${credit.creditId}:${credit.projectId}:${credit.tonnes}:${retirement.beneficiary}:${retirement.reason}:${retirement.timestamp.getTime()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private async generateQrDataUri(data: string): Promise<string> {
    try {
      const qrcode = await this.loadQrCode();
      return await qrcode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      });
    } catch {
      return '';
    }
  }

  private getTemplate(): string {
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(
      __dirname,
      'templates',
      'certificate.hbs',
    );
    return fs.readFileSync(templatePath, 'utf-8');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadHandlebars(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('handlebars');
    } catch {
      throw new Error('Handlebars is not installed');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadPuppeteer(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('puppeteer');
    } catch {
      throw new Error('Puppeteer is not installed');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadQrCode(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('qrcode');
    } catch {
      throw new Error('qrcode is not installed');
    }
  }
}
