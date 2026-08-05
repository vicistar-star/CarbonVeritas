import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RetirementRow {
  id: string;
  beneficiary: string;
  reason: string;
  accountingPeriod: string;
  tonnesRetired: number;
  txHash: string;
  ledgerSequence: number;
  timestamp: Date;
  certificateHash: string | null;
  credit: {
    creditId: number;
    projectId: string;
    methodology: string;
    geography: string;
    vintageStart: Date;
    vintageEnd: Date;
    serialPrefix: string;
    tonnes: number;
    sdgFlags: number;
  };
}

export interface Scope3LineItem {
  retirementId: string;
  creditId: number;
  projectId: string;
  methodology: string;
  geography: string;
  vintageStart: string;
  vintageEnd: string;
  serialPrefix: string;
  tonnesRetired: number;
  beneficiary: string;
  reason: string;
  accountingPeriod: string;
  retirementDate: string;
  txHash: string;
  ledgerSequence: number;
  certificateHash: string | null;
}

export interface Scope3Summary {
  totalTonnesRetired: number;
  totalRetirements: number;
  totalCredits: number;
  byMethodology: Array<{ methodology: string; tonnes: number; retirements: number }>;
  byGeography: Array<{ geography: string; tonnes: number; retirements: number }>;
  byVintage: Array<{ vintage: number; tonnes: number; retirements: number }>;
}

export interface Scope3Report {
  reportType: 'scope3';
  reportingPeriod: string;
  generatedAt: string;
  account: { wallet: string };
  summary: Scope3Summary;
  lineItems: Scope3LineItem[];
}

const CSV_HEADERS = [
  'credit_id',
  'project_id',
  'methodology',
  'geography',
  'vintage_start',
  'vintage_end',
  'serial_prefix',
  'tonnes_retired',
  'beneficiary',
  'reason',
  'accounting_period',
  'retirement_date',
  'tx_hash',
  'ledger_sequence',
  'certificate_hash',
] as const;

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getScope3Report(
    userId: string,
    wallet: string,
    year?: number,
  ): Promise<Scope3Report> {
    const rows = await this.fetchRetirements(userId, year);

    const lineItems = rows.map((row) => this.toLineItem(row));

    return {
      reportType: 'scope3',
      reportingPeriod: year ? String(year) : 'all-time',
      generatedAt: new Date().toISOString(),
      account: { wallet },
      summary: this.buildSummary(rows),
      lineItems,
    };
  }

  toScope3Csv(report: Scope3Report): string {
    const lines = report.lineItems.map((item) =>
      [
        item.creditId,
        item.projectId,
        item.methodology,
        item.geography,
        item.vintageStart,
        item.vintageEnd,
        item.serialPrefix,
        item.tonnesRetired,
        item.beneficiary,
        item.reason,
        item.accountingPeriod,
        item.retirementDate,
        item.txHash,
        item.ledgerSequence,
        item.certificateHash ?? '',
      ]
        .map((value) => this.escapeCsv(String(value)))
        .join(','),
    );

    const rows = [CSV_HEADERS.join(','), ...lines];
    if (rows.length > 1) rows.push('');

    // UTF-8 BOM so Excel opens the file with correct encoding.
    return `\uFEFF${rows.join('\n')}`;
  }

  private async fetchRetirements(
    userId: string,
    year?: number,
  ): Promise<RetirementRow[]> {
    const where = year
      ? {
          retiredById: userId,
          timestamp: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        }
      : { retiredById: userId };

    return this.prisma.retirement.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        credit: {
          select: {
            creditId: true,
            projectId: true,
            methodology: true,
            geography: true,
            vintageStart: true,
            vintageEnd: true,
            serialPrefix: true,
            tonnes: true,
            sdgFlags: true,
          },
        },
      },
    });
  }

  private toLineItem(row: RetirementRow): Scope3LineItem {
    return {
      retirementId: row.id,
      creditId: row.credit.creditId,
      projectId: row.credit.projectId,
      methodology: row.credit.methodology,
      geography: row.credit.geography,
      vintageStart: this.toDateString(row.credit.vintageStart),
      vintageEnd: this.toDateString(row.credit.vintageEnd),
      serialPrefix: row.credit.serialPrefix,
      tonnesRetired: row.tonnesRetired,
      beneficiary: row.beneficiary,
      reason: row.reason,
      accountingPeriod: row.accountingPeriod,
      retirementDate: row.timestamp.toISOString(),
      txHash: row.txHash,
      ledgerSequence: row.ledgerSequence,
      certificateHash: row.certificateHash,
    };
  }

  private buildSummary(rows: RetirementRow[]): Scope3Summary {
    const byMethodology = new Map<string, { tonnes: number; retirements: number }>();
    const byGeography = new Map<string, { tonnes: number; retirements: number }>();
    const byVintage = new Map<number, { tonnes: number; retirements: number }>();

    let totalTonnesRetired = 0;
    const uniqueCredits = new Set<number>();

    for (const row of rows) {
      totalTonnesRetired += row.tonnesRetired;
      uniqueCredits.add(row.credit.creditId);
      this.accumulate(
        byMethodology,
        row.credit.methodology || 'UNKNOWN',
        row.tonnesRetired,
      );
      this.accumulate(byGeography, row.credit.geography || 'UNKNOWN', row.tonnesRetired);
      this.accumulate(byVintage, row.credit.vintageStart.getUTCFullYear(), row.tonnesRetired);
    }

    return {
      totalTonnesRetired,
      totalRetirements: rows.length,
      totalCredits: uniqueCredits.size,
      byMethodology: [...byMethodology.entries()]
        .map(([methodology, v]) => ({ methodology, ...v }))
        .sort((a, b) => b.tonnes - a.tonnes),
      byGeography: [...byGeography.entries()]
        .map(([geography, v]) => ({ geography, ...v }))
        .sort((a, b) => b.tonnes - a.tonnes),
      byVintage: [...byVintage.entries()]
        .map(([vintage, v]) => ({ vintage, ...v }))
        .sort((a, b) => b.tonnes - a.tonnes),
    };
  }

  private accumulate(
    map: Map<string | number, { tonnes: number; retirements: number }>,
    key: string | number,
    tonnes: number,
  ): void {
    const current = map.get(key) ?? { tonnes: 0, retirements: 0 };
    current.tonnes += tonnes;
    current.retirements += 1;
    map.set(key, current);
  }

  private toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
