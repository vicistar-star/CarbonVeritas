import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { ApproveCreditDto } from './dto/approve-credit.dto';
import { RejectCreditDto } from './dto/reject-credit.dto';
import { CreditFilterDto } from './dto/credit-filter.dto';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
    private readonly ipfs: IpfsService,
  ) {}

  async issueCredit(userId: string, wallet: string, dto: CreateCreditDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const serialPrefix = this.generateSerialPrefix(dto.projectId, dto.methodology);

    const ipfsPayload: Record<string, unknown> = {
      projectId: dto.projectId,
      methodology: dto.methodology,
      vintageStart: dto.vintageStart,
      vintageEnd: dto.vintageEnd,
      tonnes: dto.tonnes,
      geography: dto.geography,
      sdgFlags: this.computeSdgFlags(dto.sdgCobenefits ?? []),
      permanenceRating: dto.permanenceRating ?? 50,
      bufferContributionPct: dto.bufferContributionPct ?? 10,
      additionalityType: dto.additionalityType ?? 0,
      documentation: dto.documentation ?? {},
      issuer: wallet,
      timestamp: new Date().toISOString(),
    };

    const { ipfsHash } = await this.ipfs.pinJson(ipfsPayload);

    const txHash = await this.stellar.submitCredit(
      wallet,
      {
        projectId: dto.projectId,
        methodology: dto.methodology,
        vintageStart: Math.floor(new Date(dto.vintageStart).getTime() / 1000),
        vintageEnd: Math.floor(new Date(dto.vintageEnd).getTime() / 1000),
        tonnes: dto.tonnes,
        geography: dto.geography,
        serialPrefix,
        sdgFlags: ipfsPayload.sdgFlags,
        permanenceRating: ipfsPayload.permanenceRating,
        bufferContributionPct: ipfsPayload.bufferContributionPct,
        additionalityType: ipfsPayload.additionalityType,
        ipfsHash,
      },
      ipfsHash,
    );

    const creditCounter = await this.getNextCreditCounter();

    const credit = await this.prisma.credit.create({
      data: {
        creditId: creditCounter,
        projectId: dto.projectId,
        methodology: dto.methodology,
        vintageStart: new Date(dto.vintageStart),
        vintageEnd: new Date(dto.vintageEnd),
        tonnes: dto.tonnes,
        geography: dto.geography,
        serialPrefix,
        sdgFlags: this.computeSdgFlags(dto.sdgCobenefits ?? []),
        permanenceRating: dto.permanenceRating ?? 50,
        bufferContributionPct: dto.bufferContributionPct ?? 10,
        additionalityType: dto.additionalityType ?? 0,
        ipfsHash,
        status: 'PENDING',
        issuerId: userId,
        ownerId: userId,
      },
      include: {
        issuer: { select: { id: true, stellarPub: true } },
        owner: { select: { id: true, stellarPub: true } },
      },
    });

    this.logger.log(`Credit issued: id=${credit.creditId}, tx=${txHash}`);

    return credit;
  }

  async approveCredit(
    userId: string,
    wallet: string,
    creditId: number,
    dto: ApproveCreditDto,
  ) {
    await this.requireVerifier(userId);

    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
      include: { approvals: true },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    if (credit.status !== 'PENDING') {
      throw new BadRequestException('Credit is not in PENDING status');
    }

    const alreadyApproved = credit.approvals.some(
      (a) => a.verifierId === userId && a.approved,
    );
    if (alreadyApproved) {
      throw new BadRequestException('Already approved this credit');
    }

    const txHash = await this.stellar.approveAndMint(wallet, creditId, dto.comments ?? '');

    await this.prisma.approval.create({
      data: {
        creditId: credit.id,
        verifierId: userId,
        approved: true,
        comments: dto.comments,
      },
    });

    const totalApprovals = await this.prisma.approval.count({
      where: { creditId: credit.id, approved: true },
    });

    const threshold = parseInt(process.env.VERIFIER_THRESHOLD ?? '2', 10);

    if (totalApprovals >= threshold && txHash) {
      await this.prisma.credit.update({
        where: { creditId },
        data: { status: 'ACTIVE', tokenId: txHash },
      });
    }

    return this.prisma.credit.findUnique({
      where: { creditId },
      include: {
        approvals: { include: { verifier: { select: { id: true, stellarPub: true } } } },
        issuer: { select: { id: true, stellarPub: true } },
        owner: { select: { id: true, stellarPub: true } },
      },
    });
  }

  async rejectCredit(
    userId: string,
    wallet: string,
    creditId: number,
    dto: RejectCreditDto,
  ) {
    await this.requireVerifier(userId);

    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
      include: { approvals: true },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    if (credit.status !== 'PENDING') {
      throw new BadRequestException('Credit is not in PENDING status');
    }

    const alreadyRejected = credit.approvals.some(
      (a) => a.verifierId === userId && !a.approved,
    );
    if (alreadyRejected) {
      throw new BadRequestException('Already recorded a decision on this credit');
    }

    await this.stellar.rejectCredit(wallet, creditId, dto.reason);

    await this.prisma.approval.create({
      data: {
        creditId: credit.id,
        verifierId: userId,
        approved: false,
        comments: dto.reason,
      },
    });

    const totalRejections = await this.prisma.approval.count({
      where: { creditId: credit.id, approved: false },
    });

    const quorum = parseInt(process.env.VERIFIER_QUORUM ?? '3', 10);

    if (totalRejections >= quorum) {
      await this.prisma.credit.update({
        where: { creditId },
        data: { status: 'REJECTED' },
      });
    }

    return this.prisma.credit.findUnique({
      where: { creditId },
      include: {
        approvals: { include: { verifier: { select: { id: true, stellarPub: true } } } },
        issuer: { select: { id: true, stellarPub: true } },
        owner: { select: { id: true, stellarPub: true } },
      },
    });
  }

  async getCredits(filters: CreditFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.methodology) {
      where.methodology = { contains: filters.methodology, mode: 'insensitive' };
    }

    if (filters.geography) {
      where.geography = filters.geography.toUpperCase();
    }

    if (filters.vintageMin || filters.vintageMax) {
      const vintageFilter: Record<string, Date> = {};
      if (filters.vintageMin) {
        vintageFilter.gte = new Date(`${filters.vintageMin}-01-01`);
      }
      if (filters.vintageMax) {
        vintageFilter.lte = new Date(`${filters.vintageMax}-12-31`);
      }
      where.vintageStart = vintageFilter;
    }

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters.issuer) {
      where.issuer = { stellarPub: filters.issuer };
    }

    if (filters.owner) {
      where.owner = { stellarPub: filters.owner };
    }

    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (filters.sort) {
      switch (filters.sort) {
        case 'created_asc':
          orderBy = { createdAt: 'asc' };
          break;
        case 'vintage_asc':
          orderBy = { vintageStart: 'asc' };
          break;
        case 'created_desc':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.credit.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          issuer: { select: { id: true, stellarPub: true } },
          owner: { select: { id: true, stellarPub: true } },
          _count: { select: { approvals: true, offers: true } },
        },
      }),
      this.prisma.credit.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCredit(creditId: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
      include: {
        issuer: { select: { id: true, stellarPub: true } },
        owner: { select: { id: true, stellarPub: true } },
        approvals: {
          include: {
            verifier: { select: { id: true, stellarPub: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    return credit;
  }

  async getProvenance(creditId: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
      include: {
        issuer: { select: { id: true, stellarPub: true } },
        owner: { select: { id: true, stellarPub: true } },
        approvals: {
          include: {
            verifier: { select: { id: true, stellarPub: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    const history: Array<Record<string, unknown>> = [
      {
        type: 'ISSUANCE',
        timestamp: credit.createdAt,
        actor: credit.issuer.stellarPub,
        details: { projectId: credit.projectId, methodology: credit.methodology },
      },
    ];

    for (const approval of credit.approvals) {
      history.push({
        type: approval.approved ? 'APPROVAL' : 'REJECTION',
        timestamp: approval.createdAt,
        actor: approval.verifier.stellarPub,
        details: { comments: approval.comments },
      });
    }

    if (credit.status === 'ACTIVE') {
      history.push({
        type: 'MINTED',
        timestamp: credit.updatedAt,
        actor: credit.issuer.stellarPub,
        details: { tokenId: credit.tokenId },
      });
    }

    return history;
  }

  async getOwnedCredits(userId: string) {
    const credits = await this.prisma.credit.findMany({
      where: { ownerId: userId },
      include: {
        issuer: { select: { id: true, stellarPub: true } },
        _count: { select: { approvals: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return credits;
  }

  private async requireVerifier(userId: string) {
    const verifier = await this.prisma.verifier.findFirst({
      where: { userId },
    });

    if (!verifier || verifier.status !== 'ACTIVE') {
      throw new ForbiddenException('Not an active verifier');
    }
  }

  private async getNextCreditCounter(): Promise<number> {
    const last = await this.prisma.credit.findFirst({
      orderBy: { creditId: 'desc' },
      select: { creditId: true },
    });
    return (last?.creditId ?? 0) + 1;
  }

  private generateSerialPrefix(projectId: string, methodology: string): string {
    const abbr = methodology.replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
    return `${projectId}-${abbr}-`;
  }

  private computeSdgFlags(goals: number[]): number {
    return goals.reduce((acc, g) => acc | (1 << (g - 1)), 0);
  }
}
