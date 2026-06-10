import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { RetireCreditDto } from './dto/retire-credit.dto';

@Injectable()
export class RetirementService {
  private readonly logger = new Logger(RetirementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
  ) {}

  async retireCredit(
    userId: string,
    wallet: string,
    creditId: number,
    dto: RetireCreditDto,
  ) {
    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
      include: { owner: true },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    if (credit.ownerId !== userId) {
      throw new BadRequestException('You do not own this credit');
    }

    if (credit.status !== 'ACTIVE') {
      throw new BadRequestException('Credit is not ACTIVE');
    }

    const alreadyRetired = await this.stellar.isRetired(creditId);
    if (alreadyRetired) {
      throw new BadRequestException('Credit is already retired on-chain');
    }

    const tonnesRetired = dto.tonnesRetired
      ? parseFloat(dto.tonnesRetired)
      : credit.tonnes;

    if (tonnesRetired <= 0 || tonnesRetired > credit.tonnes) {
      throw new BadRequestException('Invalid retirement amount');
    }

    const result = await this.stellar.retire(
      wallet,
      creditId,
      dto.reason,
      dto.beneficiary,
      dto.accountingPeriod,
    );

    const retirement = await this.prisma.retirement.create({
      data: {
        creditId: credit.id,
        retiredById: userId,
        beneficiary: dto.beneficiary,
        reason: dto.reason,
        accountingPeriod: dto.accountingPeriod,
        tonnesRetired,
        txHash: result.txHash as string,
        ledgerSequence: result.ledgerSequence as number,
      },
    });

    if (tonnesRetired >= credit.tonnes) {
      await this.prisma.credit.update({
        where: { creditId },
        data: { status: 'RETIRED' },
      });
    }

    this.logger.log(
      `Credit retired: creditId=${creditId}, tonnes=${tonnesRetired}, beneficiary=${dto.beneficiary}`,
    );

    return {
      ...retirement,
      credit: { creditId: credit.creditId, projectId: credit.projectId },
    };
  }

  async getCertificate(creditId: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
      include: {
        retirements: {
          orderBy: { timestamp: 'desc' },
          include: {
            credit: {
              select: {
                projectId: true,
                methodology: true,
                geography: true,
                vintageStart: true,
                vintageEnd: true,
                tonnes: true,
              },
            },
          },
        },
      },
    });

    if (!credit) {
      throw new NotFoundException('Credit not found');
    }

    if (credit.status !== 'RETIRED' || credit.retirements.length === 0) {
      throw new BadRequestException('Credit has not been retired');
    }

    return {
      credit: {
        creditId: credit.creditId,
        projectId: credit.projectId,
        methodology: credit.methodology,
        geography: credit.geography,
        vintageStart: credit.vintageStart,
        vintageEnd: credit.vintageEnd,
        totalTonnes: credit.tonnes,
      },
      retirements: credit.retirements.map((r) => ({
        id: r.id,
        beneficiary: r.beneficiary,
        reason: r.reason,
        accountingPeriod: r.accountingPeriod,
        tonnesRetired: r.tonnesRetired,
        txHash: r.txHash,
        ledgerSequence: r.ledgerSequence,
        timestamp: r.timestamp,
        certificateHash: r.certificateHash,
      })),
    };
  }
}
