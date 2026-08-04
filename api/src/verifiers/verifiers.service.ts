import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { EventEmitterService } from '../events/event-emitter.service';
import { RegisterVerifierDto } from './dto/register-verifier.dto';

@Injectable()
export class VerifiersService {
  private readonly logger = new Logger(VerifiersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
    private readonly events: EventEmitterService,
  ) {}

  async register(userId: string, wallet: string, dto: RegisterVerifierDto) {
    const existing = await this.prisma.verifier.findFirst({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Already registered as a verifier');
    }

    const success = await this.stellar.registerVerifier(wallet, dto.stake);

    if (!success) {
      throw new BadRequestException('On-chain verifier registration failed');
    }

    const verifier = await this.prisma.verifier.create({
      data: {
        userId,
        stake: dto.stake,
        status: 'ACTIVE',
        reputation: 0,
        heartbeatAt: new Date(),
      },
      include: {
        user: { select: { id: true, stellarPub: true } },
      },
    });

    this.logger.log(`Verifier registered: userId=${userId}, wallet=${wallet}, stake=${dto.stake}`);

    await this.events.emit('verifier.registered', {
      userId,
      wallet,
      stake: dto.stake,
    });

    return verifier;
  }

  async findAll() {
    const verifiers = await this.prisma.verifier.findMany({
      orderBy: { reputation: 'desc' },
      include: {
        user: { select: { id: true, stellarPub: true } },
      },
    });

    return verifiers;
  }

  async findOne(id: string) {
    const verifier = await this.prisma.verifier.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, stellarPub: true } },
      },
    });

    if (!verifier) {
      throw new NotFoundException('Verifier not found');
    }

    const approvalStats = await this.prisma.approval.aggregate({
      where: { verifierId: verifier.userId },
      _count: true,
    });

    return {
      ...verifier,
      totalApprovals: approvalStats._count,
    };
  }

  async getApprovals(id: string) {
    const verifier = await this.prisma.verifier.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!verifier) {
      throw new NotFoundException('Verifier not found');
    }

    const approvals = await this.prisma.approval.findMany({
      where: { verifierId: verifier.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        credit: {
          select: {
            creditId: true,
            projectId: true,
            methodology: true,
            status: true,
          },
        },
      },
    });

    return approvals;
  }

  async getPendingCredits() {
    const credits = await this.prisma.credit.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        issuer: { select: { id: true, stellarPub: true } },
        _count: { select: { approvals: true } },
      },
    });

    return credits;
  }

  async heartbeat(id: string) {
    const verifier = await this.prisma.verifier.findUnique({
      where: { id },
    });

    if (!verifier) {
      throw new NotFoundException('Verifier not found');
    }

    const updated = await this.prisma.verifier.update({
      where: { id },
      data: { heartbeatAt: new Date() },
    });

    this.logger.log(`Heartbeat: verifierId=${id}`);

    return updated;
  }
}
