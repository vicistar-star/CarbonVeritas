import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SorobanClient } from '../stellar/soroban-client';
import {
  decodeContractConfig,
  scAddress,
  scU32,
  scU64,
  zipNativeFields,
  VERIFIER_FIELDS,
} from '../stellar/scval';
import type { UpdateConfigDto } from './dto/admin.dto';

const CONTRACT_ENV_KEYS = [
  'CREDIT_REGISTRY_CONTRACT',
  'MARKETPLACE_CONTRACT',
  'RETIREMENT_TRACKER_CONTRACT',
  'VERIFIER_STAKE_CONTRACT',
  'MERKLE_BRIDGE_CONTRACT',
  'REVENUE_SPLIT_CONTRACT',
] as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanClient,
  ) {}

  private requireContract(key: string): string {
    const address = this.config.get<string>(key);
    if (!address) {
      throw new BadRequestException(`${key} is not configured`);
    }
    return address;
  }

  private requireAdminSecret(): string {
    const secret = this.config.get<string>('STELLAR_ADMIN_SECRET_KEY');
    if (!secret) {
      throw new BadRequestException(
        'STELLAR_ADMIN_SECRET_KEY is not configured',
      );
    }
    return secret;
  }

  private requireAdminPublicKey(): string {
    const pub = this.config.get<string>('STELLAR_ADMIN_PUBLIC_KEY');
    if (!pub) {
      throw new BadRequestException(
        'STELLAR_ADMIN_PUBLIC_KEY is not configured',
      );
    }
    return pub;
  }

  async getProtocolConfig(): Promise<Record<string, unknown>> {
    const contractId = this.requireContract('CREDIT_REGISTRY_CONTRACT');
    const rv = await this.soroban.readScVal({
      contractId,
      method: 'get_config',
      args: [],
    });
    if (!rv) {
      throw new BadRequestException('Protocol config unavailable on-chain');
    }
    return decodeContractConfig(rv);
  }

  async updateProtocolConfig(dto: UpdateConfigDto): Promise<boolean> {
    const contractId = this.requireContract('CREDIT_REGISTRY_CONTRACT');
    const adminPub = this.requireAdminPublicKey();
    const adminSecret = this.requireAdminSecret();

    const receipt = await this.soroban.invoke({
      contractId,
      method: 'update_config',
      args: [
        scAddress(adminPub),
        scU32(dto.verifierThreshold),
        scU32(dto.verifierQuorum),
        scU64(dto.approvalWindow),
        scU32(dto.protocolFeeBps),
        scU32(dto.bufferPoolPct),
      ],
      signerSecret: adminSecret,
    });

    this.logger.log(`Protocol config updated in ${receipt.hash}`);
    return receipt.returnValue === true;
  }

  getContracts(): Record<string, string | null> {
    return Object.fromEntries(
      CONTRACT_ENV_KEYS.map((key) => [key, this.config.get<string>(key) ?? null]),
    );
  }

  async listVerifiers(): Promise<Record<string, unknown>[]> {
    const contractId = this.requireContract('VERIFIER_STAKE_CONTRACT');
    const rv = await this.soroban.read({
      contractId,
      method: 'get_all_verifiers',
      args: [],
    });
    if (!Array.isArray(rv)) return [];
    return rv.map((row) =>
      Array.isArray(row)
        ? zipNativeFields(VERIFIER_FIELDS, row)
        : { address: row },
    );
  }

  async addVerifier(address: string): Promise<boolean> {
    const contractId = this.requireContract('CREDIT_REGISTRY_CONTRACT');
    const adminPub = this.requireAdminPublicKey();
    await this.soroban.invoke({
      contractId,
      method: 'add_verifier',
      args: [scAddress(adminPub), scAddress(address)],
      signerSecret: this.requireAdminSecret(),
    });
    return true;
  }

  async removeVerifier(address: string): Promise<boolean> {
    const contractId = this.requireContract('CREDIT_REGISTRY_CONTRACT');
    const adminPub = this.requireAdminPublicKey();
    await this.soroban.invoke({
      contractId,
      method: 'remove_verifier',
      args: [scAddress(adminPub), scAddress(address)],
      signerSecret: this.requireAdminSecret(),
    });
    return true;
  }

  async getSystemStatus(): Promise<Record<string, unknown>> {
    const [users, credits, verifiers, offers, retirements, webhooks] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.credit.count(),
        this.prisma.verifier.count(),
        this.prisma.offer.count(),
        this.prisma.retirement.count(),
        this.prisma.webhook.count(),
      ]);

    let network: Record<string, unknown>;
    try {
      const ledger = await this.soroban.getLatestLedger();
      network = { connected: true, ...ledger };
    } catch {
      network = { connected: false };
    }

    return {
      network,
      counts: {
        users,
        credits,
        verifiers,
        offers,
        retirements,
        webhooks,
      },
    };
  }
}
