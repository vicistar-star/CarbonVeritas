import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import { SorobanClient, SorobanError } from './soroban-client';
import {
  RawScVal,
  bytesToHex,
  decodeApprovalRecord,
  decodeCreditMetadata,
  decodeOffer,
  decodeRegistryRoot,
  decodeRetirementRecord,
  scAddress,
  scBytes32,
  scI128,
  scOptionI128,
  scOptionString,
  scOptionU64,
  scString,
  scU32,
  scU64,
  scVecBytes32,
  toCreditMetadataScVal,
  zipNativeFields,
} from './scval';
import { RETIREMENT_FIELDS } from './scval';

/**
 * On-chain bridge between the API and the deployed CarbonVeritas contracts.
 *
 * Every mutation is submitted as a real Soroban transaction signed with the
 * configured operator/verifier keys and awaited until it settles; read paths
 * execute simulation calls. Contracts are resolved from env configuration:
 *
 *   CREDIT_REGISTRY_CONTRACT, MARKETPLACE_CONTRACT, RETIREMENT_TRACKER_CONTRACT,
 *   VERIFIER_STAKE_CONTRACT, MERKLE_BRIDGE_CONTRACT, REVENUE_SPLIT_CONTRACT
 *
 * Mutation signers come from STELLAR_ADMIN_SECRET_KEY (issuer/owner/admin
 * actions) and STELLAR_VERIFIER_SECRET_KEY (verifier actions). The caller's
 * wallet address passed in each method must match the signing account's public
 * key, otherwise the contract's `require_auth` guard reverts the call.
 */
@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly soroban: SorobanClient,
  ) {}

  private contract(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new BadGatewayException(
        `${key} is not configured; set it to the deployed contract address`,
      );
    }
    return value;
  }

  private adminSecret(): string {
    const value = this.config.get<string>('STELLAR_ADMIN_SECRET_KEY');
    if (!value) {
      throw new BadGatewayException(
        'STELLAR_ADMIN_SECRET_KEY is not configured',
      );
    }
    return value;
  }

  private verifierSecret(): string {
    const value = this.config.get<string>('STELLAR_VERIFIER_SECRET_KEY');
    if (!value) {
      throw new BadGatewayException(
        'STELLAR_VERIFIER_SECRET_KEY is not configured',
      );
    }
    return value;
  }

  private async invoke(
    contractKey: string,
    method: string,
    args: RawScVal[],
    signerSecret: string,
  ) {
    try {
      return await this.soroban.invoke({
        contractId: this.contract(contractKey),
        method,
        args,
        signerSecret,
      });
    } catch (error) {
      if (error instanceof SorobanError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }

  private async read(contractKey: string, method: string, args: RawScVal[]) {
    try {
      return await this.soroban.read({
        contractId: this.contract(contractKey),
        method,
        args,
      });
    } catch (error) {
      if (error instanceof SorobanError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }

  private async readScVal(
    contractKey: string,
    method: string,
    args: RawScVal[],
  ) {
    try {
      return await this.soroban.readScVal({
        contractId: this.contract(contractKey),
        method,
        args,
      });
    } catch (error) {
      if (error instanceof SorobanError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }

  private warnIfSignerMismatch(action: string, wallet: string, secret: string) {
    const signer = Keypair.fromSecret(secret).publicKey();
    if (wallet !== signer) {
      this.logger.warn(
        `${action}: caller wallet ${wallet} differs from configured signer ${signer}; ` +
          'the contract require_auth guard will revert this call unless they match',
      );
    }
  }

  async submitCredit(
    issuer: string,
    metadata: Record<string, unknown>,
    ipfsHash: string,
  ): Promise<string> {
    this.warnIfSignerMismatch('submitCredit', issuer, this.adminSecret());
    const receipt = await this.invoke(
      'CREDIT_REGISTRY_CONTRACT',
      'submit_credit',
      [
        scAddress(issuer),
        toCreditMetadataScVal(metadata),
        scString(ipfsHash),
      ],
      this.adminSecret(),
    );
    this.logger.log(
      `submitCredit: issuer=${issuer}, creditId=${
        String(receipt.returnValue ?? '?')
      }, tx=${receipt.hash}`,
    );
    return receipt.hash;
  }

  async approveAndMint(
    verifier: string,
    creditId: number,
    comments: string,
  ): Promise<string | null> {
    this.warnIfSignerMismatch('approveAndMint', verifier, this.verifierSecret());
    const receipt = await this.invoke(
      'CREDIT_REGISTRY_CONTRACT',
      'approve_and_mint',
      [scAddress(verifier), scU64(creditId), scString(comments)],
      this.verifierSecret(),
    );
    const value = receipt.returnValue;
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      return first instanceof Buffer
        ? bytesToHex(first)
        : String(first ?? '');
    }
    return null;
  }

  async rejectCredit(
    verifier: string,
    creditId: number,
    reason: string,
  ): Promise<boolean> {
    this.warnIfSignerMismatch('rejectCredit', verifier, this.verifierSecret());
    const receipt = await this.invoke(
      'CREDIT_REGISTRY_CONTRACT',
      'reject_credit',
      [scAddress(verifier), scU64(creditId), scString(reason)],
      this.verifierSecret(),
    );
    return receipt.returnValue === true;
  }

  async transferCredit(
    from: string,
    to: string,
    creditId: number,
  ): Promise<boolean> {
    this.warnIfSignerMismatch('transferCredit', from, this.adminSecret());
    const receipt = await this.invoke(
      'CREDIT_REGISTRY_CONTRACT',
      'transfer_credit',
      [scAddress(from), scAddress(to), scU64(creditId)],
      this.adminSecret(),
    );
    return receipt.returnValue === true;
  }

  async retire(
    owner: string,
    creditId: number,
    reason: string,
    beneficiary: string,
    accountingPeriod: string,
  ): Promise<Record<string, unknown>> {
    this.warnIfSignerMismatch('retire', owner, this.adminSecret());
    const receipt = await this.invoke(
      'RETIREMENT_TRACKER_CONTRACT',
      'retire',
      [
        scAddress(owner),
        scU64(creditId),
        scString(reason),
        scString(beneficiary),
        scString(accountingPeriod),
      ],
      this.adminSecret(),
    );
    const record = zipNativeFields(
      RETIREMENT_FIELDS,
      Array.isArray(receipt.returnValue) ? receipt.returnValue : [],
    );
    return {
      creditId,
      retiredBy: record.retiredBy ?? owner,
      beneficiary: record.beneficiary ?? beneficiary,
      reason: record.reason ?? reason,
      accountingPeriod: record.accountingPeriod ?? accountingPeriod,
      txHash: receipt.hash,
      ledgerSequence:
        typeof record.ledgerSequence === 'bigint'
          ? Number(record.ledgerSequence)
          : record.ledgerSequence ?? 0,
      timestamp:
        typeof record.timestamp === 'bigint'
          ? Number(record.timestamp) * 1000
          : Date.now(),
    };
  }

  async isRetired(creditId: number): Promise<boolean> {
    const value = await this.read(
      'RETIREMENT_TRACKER_CONTRACT',
      'is_retired',
      [scU64(creditId)],
    );
    return value === true;
  }

  async getCredit(creditId: number): Promise<Record<string, unknown>> {
    const sv = await this.readScVal(
      'CREDIT_REGISTRY_CONTRACT',
      'get_credit',
      [scU64(creditId)],
    );
    if (sv === null) return {};
    const metadata = decodeCreditMetadata(sv);
    return {
      creditId,
      projectId: metadata.projectId,
      methodology: metadata.methodology,
      vintageStart: Number(metadata.vintageStart ?? 0),
      vintageEnd: Number(metadata.vintageEnd ?? 0),
      tonnes: Number(metadata.tonnes ?? 0),
      geography: metadata.geography,
      serialPrefix: metadata.serialPrefix,
      sdgFlags: metadata.sdgFlags,
      permanenceRating: metadata.permanenceRating,
      bufferContributionPct: metadata.bufferContributionPct,
      additionalityType: metadata.additionalityType,
      ipfsHash: metadata.ipfsHash,
      status: this.mapCreditStatus(Number(metadata.status ?? 0)),
      tokenId:
        metadata.tokenId instanceof Buffer
          ? bytesToHex(metadata.tokenId)
          : metadata.tokenId,
    };
  }

  async getProvenance(
    creditId: number,
  ): Promise<Array<Record<string, unknown>>> {
    const sv = await this.readScVal(
      'CREDIT_REGISTRY_CONTRACT',
      'get_provenance',
      [scU64(creditId)],
    );
    if (sv === null) return [];
    const native = sv.value() as unknown[];
    if (!Array.isArray(native)) return [];
    return native.map((entry, i) => ({
      ...decodeApprovalRecord(entry as RawScVal),
      step: i,
    }));
  }

  async getOwner(creditId: number): Promise<string> {
    const value = await this.read(
      'CREDIT_REGISTRY_CONTRACT',
      'get_owner',
      [scU64(creditId)],
    );
    return typeof value === 'string' ? value : '';
  }

  async createOffer(
    seller: string,
    creditId: number,
    pricePerTonne: number,
    amount: number,
    currency: string,
    expiry: number | null,
  ): Promise<number> {
    this.warnIfSignerMismatch('createOffer', seller, this.adminSecret());
    const receipt = await this.invoke(
      'MARKETPLACE_CONTRACT',
      'create_offer',
      [
        scAddress(seller),
        scU64(creditId),
        scI128(pricePerTonne),
        scI128(amount),
        scAddress(currency),
        scOptionU64(expiry),
      ],
      this.adminSecret(),
    );
    return typeof receipt.returnValue === 'bigint'
      ? Number(receipt.returnValue)
      : Number(receipt.returnValue ?? 0);
  }

  async buyCredits(
    buyer: string,
    offerId: number,
    amount: number,
  ): Promise<boolean> {
    this.warnIfSignerMismatch('buyCredits', buyer, this.adminSecret());
    const receipt = await this.invoke(
      'MARKETPLACE_CONTRACT',
      'buy_credits',
      [scAddress(buyer), scU64(offerId), scI128(amount)],
      this.adminSecret(),
    );
    return receipt.returnValue === true;
  }

  async cancelOffer(caller: string, offerId: number): Promise<boolean> {
    this.warnIfSignerMismatch('cancelOffer', caller, this.adminSecret());
    const receipt = await this.invoke(
      'MARKETPLACE_CONTRACT',
      'cancel_offer',
      [scAddress(caller), scU64(offerId)],
      this.adminSecret(),
    );
    return receipt.returnValue === true;
  }

  async getListings(
    methodologyFilter?: string,
    geographyFilter?: string,
    maxPrice?: number,
    offset = 0,
    limit = 20,
  ): Promise<Array<Record<string, unknown>>> {
    const sv = await this.readScVal(
      'MARKETPLACE_CONTRACT',
      'get_listings',
      [
        scOptionString(methodologyFilter ?? null),
        scOptionString(geographyFilter ?? null),
        scOptionI128(maxPrice ?? null),
        scU32(offset),
        scU32(limit),
      ],
    );
    if (sv === null) return [];
    const native = sv.value() as unknown[];
    if (!Array.isArray(native)) return [];
    return native.map((offer, i) => ({
      ...decodeOffer(offer as RawScVal),
      index: i + offset,
    }));
  }

  async getOffer(offerId: number): Promise<Record<string, unknown>> {
    const sv = await this.readScVal(
      'MARKETPLACE_CONTRACT',
      'get_offer',
      [scU64(offerId)],
    );
    return sv === null ? {} : decodeOffer(sv);
  }

  async bridgeIn(
    bridger: string,
    sourceRegistry: string,
    sourceSerial: string,
    merkleProof: string[],
    merkleRoot: string,
    metadata: Record<string, unknown>,
  ): Promise<{ creditId: number; txHash: string }> {
    this.warnIfSignerMismatch('bridgeIn', bridger, this.adminSecret());
    if (merkleProof.length === 0) {
      throw new BadGatewayException('bridgeIn requires a non-empty merkle proof');
    }
    const [leaf, ...rest] = merkleProof;
    const receipt = await this.invoke(
      'MERKLE_BRIDGE_CONTRACT',
      'bridge_in',
      [
        scAddress(bridger),
        scString(sourceRegistry),
        scString(sourceSerial),
        scBytes32(leaf),
        scVecBytes32(rest),
        toCreditMetadataScVal(metadata),
      ],
      this.adminSecret(),
    );
    this.logger.log(
      `bridgeIn: ${sourceRegistry}/${sourceSerial}, expectedRoot=${merkleRoot}, creditId=${String(receipt.returnValue ?? '?')}`,
    );
    return {
      creditId:
        typeof receipt.returnValue === 'bigint'
          ? Number(receipt.returnValue)
          : Number(receipt.returnValue ?? 0),
      txHash: receipt.hash,
    };
  }

  async bridgeOut(owner: string, creditId: number): Promise<string> {
    this.warnIfSignerMismatch('bridgeOut', owner, this.adminSecret());
    const receipt = await this.invoke(
      'MERKLE_BRIDGE_CONTRACT',
      'bridge_out',
      [scAddress(owner), scU64(creditId)],
      this.adminSecret(),
    );
    return receipt.hash;
  }

  async verifyProof(
    leaf: string,
    proof: string[],
    root: string,
  ): Promise<boolean> {
    const value = await this.read('MERKLE_BRIDGE_CONTRACT', 'verify_proof', [
      scBytes32(leaf),
      scVecBytes32(proof),
      scBytes32(root),
    ]);
    return value === true;
  }

  async getRegistryRoot(
    registry: string,
  ): Promise<Record<string, unknown> | null> {
    const sv = await this.readScVal(
      'MERKLE_BRIDGE_CONTRACT',
      'get_registry_root',
      [scString(registry)],
    );
    if (sv === null) return null;
    const native = sv.value() as unknown[];
    if (!Array.isArray(native) || native.length === 0) return null;
    const decoded = decodeRegistryRoot(native[0] as RawScVal);
    return {
      registry,
      root:
        decoded.root instanceof Buffer ? bytesToHex(decoded.root) : decoded.root,
      blockHeight:
        typeof decoded.blockHeight === 'bigint'
          ? Number(decoded.blockHeight)
          : decoded.blockHeight,
      updatedAt:
        typeof decoded.updatedAt === 'bigint'
          ? Number(decoded.updatedAt) * 1000
          : decoded.updatedAt,
    };
  }

  async updateRegistryRoot(
    admin: string,
    registry: string,
    root: string,
    blockHeight: number,
  ): Promise<string> {
    this.warnIfSignerMismatch('updateRegistryRoot', admin, this.adminSecret());
    const receipt = await this.invoke(
      'MERKLE_BRIDGE_CONTRACT',
      'update_registry_root',
      [
        scAddress(admin),
        scString(registry),
        scBytes32(root),
        scU64(blockHeight),
      ],
      this.adminSecret(),
    );
    this.logger.log(
      `updateRegistryRoot: registry=${registry}, root=${root}, blockHeight=${blockHeight}, tx=${receipt.hash}`,
    );
    return receipt.hash;
  }

  async registerVerifier(address: string, stake: number): Promise<boolean> {
    this.warnIfSignerMismatch('registerVerifier', address, this.verifierSecret());
    if (stake > 0) {
      this.logger.log(
        `registerVerifier: contract stakes the fixed MIN_STAKE amount (stake=${stake} requested)`,
      );
    }
    const receipt = await this.invoke(
      'VERIFIER_STAKE_CONTRACT',
      'register',
      [scAddress(address)],
      this.verifierSecret(),
    );
    return receipt.returnValue === true;
  }

  async slashVerifier(address: string, amount: number): Promise<boolean> {
    this.warnIfSignerMismatch('slashVerifier', address, this.adminSecret());
    const receipt = await this.invoke(
      'VERIFIER_STAKE_CONTRACT',
      'slash',
      [
        scAddress(this.adminPublicKey()),
        scAddress(address),
        scI128(amount),
      ],
      this.adminSecret(),
    );
    return receipt.returnValue === true;
  }

  async distributeRevenue(
    creditId: number,
    projectId: string,
    asset: string,
    amount: number | bigint,
  ): Promise<boolean> {
    this.warnIfSignerMismatch('distributeRevenue', asset, this.adminSecret());
    const receipt = await this.invoke(
      'REVENUE_SPLIT_CONTRACT',
      'distribute',
      [
        scAddress(this.adminPublicKey()),
        scString(projectId),
        scAddress(asset),
        scI128(amount),
      ],
      this.adminSecret(),
    );
    this.logger.log(
      `distributeRevenue: project=${projectId}, asset=${asset}, creditId=${creditId}`,
    );
    return receipt.returnValue === true;
  }

  async getCertificateHash(creditId: number): Promise<string> {
    const sv = await this.readScVal(
      'RETIREMENT_TRACKER_CONTRACT',
      'get_retirement_record',
      [scU64(creditId)],
    );
    const native = sv === null ? null : (sv.value() as unknown[]);
    if (sv === null || !Array.isArray(native) || native.length === 0) {
      this.logger.warn(
        `getCertificateHash: no on-chain retirement record for credit ${creditId}`,
      );
      return '';
    }
    const record = decodeRetirementRecord(native[0] as RawScVal);
    const hash = record.certificateHash;
    return hash instanceof Buffer ? bytesToHex(hash) : String(hash ?? '');
  }

  private adminPublicKey(): string {
    return Keypair.fromSecret(this.adminSecret()).publicKey();
  }

  private mapCreditStatus(status: number): string {
    switch (status) {
      case 0:
        return 'PENDING';
      case 1:
        return 'ACTIVE';
      case 2:
        return 'RETIRED';
      case 3:
        return 'REJECTED';
      case 4:
        return 'BRIDGED';
      default:
        return 'UNKNOWN';
    }
  }
}
