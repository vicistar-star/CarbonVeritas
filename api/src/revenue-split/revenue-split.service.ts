import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StellarService } from '../stellar/stellar.service';
import {
  ConfigureRevenueSplitDto,
  DistributeRevenueSplitDto,
} from './dto/revenue-split.dto';

/**
 * Revenue split: configures and distributes project payments among
 * beneficiaries, with the protocol fee deducted first. Mirrors the
 * RevenueSplit Soroban contract.
 */
@Injectable()
export class RevenueSplitService {
  private readonly logger = new Logger(RevenueSplitService.name);

  constructor(private readonly stellar: StellarService) {}

  async configure(
    adminWallet: string,
    projectId: string,
    dto: ConfigureRevenueSplitDto,
  ) {
    const total = dto.beneficiaries.reduce((sum, b) => sum + b.bps, 0);
    if (total !== 10000) {
      throw new BadRequestException(
        `Beneficiary bps shares must sum to exactly 10000, got ${total}`,
      );
    }

    const txHash = await this.stellar.configureRevenueSplit(
      adminWallet,
      projectId,
      dto.beneficiaries,
    );
    this.logger.log(
      `Revenue split configured: projectId=${projectId}, tx=${txHash}`,
    );
    return { projectId, txHash };
  }

  async distribute(
    callerWallet: string,
    projectId: string,
    dto: DistributeRevenueSplitDto,
  ) {
    const txHash = await this.stellar.distributeRevenueSplit(
      callerWallet,
      projectId,
      dto.asset,
      dto.amount,
    );
    this.logger.log(
      `Revenue split distributed: projectId=${projectId}, amount=${dto.amount}, tx=${txHash}`,
    );
    return { projectId, asset: dto.asset, amount: dto.amount, txHash };
  }

  async getConfig(projectId: string) {
    const config = await this.stellar.getRevenueConfig(projectId);
    if (!config) {
      throw new NotFoundException(
        `No revenue split configured for project ${projectId}`,
      );
    }
    return config;
  }
}
