import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { BridgeInDto } from './dto/bridge-in.dto';
import { BridgeFilterDto } from './dto/bridge-filter.dto';
import { UpdateRegistryRootDto } from './dto/registry-root.dto';

/**
 * Merkle Bridge: imports credits from legacy registries (Verra, Gold
 * Standard, CDM, ACR, CAR, Plan Vivo) onto Stellar with cryptographic
 * proof-of-inclusion, and lets owners bridge credits back for retirement
 * on the source registry.
 *
 * Every mutation first round-trips through the MerkleBridge Soroban
 * contract; the BridgeRecord table is the off-chain index that powers
 * fast registry/serial lookups and the public audit ledger.
 */
@Injectable()
export class BridgeService {
  private readonly logger = new Logger(BridgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
  ) {}

  async bridgeIn(userId: string, wallet: string, dto: BridgeInDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Read-only verification first so callers get a clear error before a
    // settlement fee is paid for a proof that will be rejected on-chain.
    const proofOk = await this.stellar.verifyProof(
      dto.leaf,
      dto.merkleProof,
      dto.merkleRoot,
    );
    if (!proofOk) {
      throw new BadRequestException(
        'Merkle proof does not verify against the provided root',
      );
    }

    const { creditId, txHash } = await this.stellar.bridgeIn(
      wallet,
      dto.sourceRegistry,
      dto.sourceSerial,
      [dto.leaf, ...dto.merkleProof],
      dto.merkleRoot,
      this.toOnChainMetadata(dto),
    );

    const record = await this.prisma.bridgeRecord.create({
      data: {
        creditId,
        sourceRegistry: dto.sourceRegistry,
        sourceSerial: dto.sourceSerial,
        merkleRoot: dto.merkleRoot,
        status: 'INBOUND',
        bridgerId: userId,
        txHash,
      },
      include: { bridger: { select: { id: true, stellarPub: true } } },
    });

    this.logger.log(
      `Bridge in: creditId=${creditId}, ${dto.sourceRegistry}/${dto.sourceSerial}, tx=${txHash}`,
    );

    return record;
  }

  async bridgeOut(userId: string, wallet: string, creditId: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { creditId },
    });
    if (!credit) {
      throw new NotFoundException('Credit not found');
    }
    if (credit.ownerId !== userId) {
      throw new ForbiddenException('You do not own this credit');
    }

    const record = await this.prisma.bridgeRecord.findFirst({
      where: { creditId },
    });
    if (!record) {
      throw new BadRequestException(
        'Only credits imported from a legacy registry can be bridged out',
      );
    }
    if (record.status === 'OUTBOUND') {
      throw new BadRequestException('Credit has already been bridged out');
    }

    const txHash = await this.stellar.bridgeOut(wallet, creditId);

    const updated = await this.prisma.bridgeRecord.update({
      where: { id: record.id },
      data: { status: 'OUTBOUND', txHash },
      include: { bridger: { select: { id: true, stellarPub: true } } },
    });

    this.logger.log(`Bridge out: creditId=${creditId}, tx=${txHash}`);

    return updated;
  }

  async getRecords(filters: BridgeFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.registry) {
      where.sourceRegistry = filters.registry.toUpperCase();
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.bridgeRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { bridger: { select: { id: true, stellarPub: true } } },
      }),
      this.prisma.bridgeRecord.count({ where }),
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

  async getRegistryRoot(registry: string) {
    const root = await this.stellar.getRegistryRoot(registry.toUpperCase());
    if (!root) {
      throw new NotFoundException(
        `No merkle root published for registry ${registry.toUpperCase()}`,
      );
    }
    return root;
  }

  async updateRegistryRoot(
    wallet: string,
    registry: string,
    dto: UpdateRegistryRootDto,
  ): Promise<Record<string, string | number>> {
    const txHash = await this.stellar.updateRegistryRoot(
      wallet,
      registry,
      dto.root,
      dto.blockHeight,
    );
    this.logger.log(
      `Registry root updated: ${registry}, block=${dto.blockHeight}, tx=${txHash}`,
    );
    return { registry, blockHeight: dto.blockHeight, txHash };
  }

  private toOnChainMetadata(dto: BridgeInDto): Record<string, unknown> {
    return {
      projectId: dto.metadata.projectId,
      methodology: dto.metadata.methodology,
      vintageStart: dto.metadata.vintageStart,
      vintageEnd: dto.metadata.vintageEnd,
      tonnes: dto.metadata.tonnes,
      geography: dto.metadata.geography,
      serialPrefix: dto.metadata.serialPrefix,
      sdgFlags: dto.metadata.sdgFlags ?? 0,
      permanenceRating: dto.metadata.permanenceRating ?? 50,
      bufferContributionPct: dto.metadata.bufferContributionPct ?? 10,
      additionalityType: dto.metadata.additionalityType ?? 0,
      ipfsHash: dto.metadata.ipfsHash ?? '',
    };
  }
}
