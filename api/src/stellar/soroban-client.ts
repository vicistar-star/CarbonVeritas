import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';
import { RawScVal } from './scval';

export class SorobanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SorobanError';
  }
}

export interface SorobanInvokeReceipt {
  hash: string;
  status: 'SUCCESS' | 'FAILED';
  returnValue: unknown;
}

export interface SorobanInvokeOptions {
  contractId: string;
  method: string;
  args: RawScVal[];
  signerSecret: string;
  fee?: string;
}

export interface SorobanReadOptions {
  contractId: string;
  method: string;
  args: RawScVal[];
  source?: string;
}

/**
 * Real Soroban RPC client: builds, signs, submits and settles contract
 * transactions via `@stellar/stellar-sdk`'s rpc.Server, and executes read-only
 * contract calls through `simulateTransaction` (no submission needed).
 */
@Injectable()
export class SorobanClient {
  private readonly logger = new Logger(SorobanClient.name);
  private serverInstance?: rpc.Server;

  constructor(private readonly config: ConfigService) {}

  get rpcUrl(): string {
    return (
      this.config.get<string>('SOROBAN_RPC_URL') ??
      'https://soroban-testnet.stellar.org'
    );
  }

  get networkPassphrase(): string {
    return (
      this.config.get<string>('STELLAR_NETWORK_PASSPHRASE') ?? Networks.TESTNET
    );
  }

  get server(): rpc.Server {
    if (!this.serverInstance) {
      this.serverInstance = new rpc.Server(this.rpcUrl, {
        allowHttp: true,
      });
    }
    return this.serverInstance;
  }

  /** Test hook: inject a fake rpc.Server. */
  setServer(server: rpc.Server): void {
    this.serverInstance = server;
  }

  /** Latest ledger sequence + hash, used for network health checks. */
  async getLatestLedger(): Promise<{ sequence: number; ledgerHash: string }> {
    const ledger = await this.server.getLatestLedger();
    return {
      sequence: ledger.sequence,
      ledgerHash: ledger.id,
    };
  }

  private defaultFee(): string {
    const raw = this.config.get<string>('STELLAR_TX_FEE');
    const parsed = raw ? parseInt(raw, 10) : 100000;
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '100000';
  }

  private async waitForReceipt(
    hash: string,
    timeoutMs = 30000,
    pollMs = 1500,
  ): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
    const started = Date.now();
    for (;;) {
      const tx = await this.server.getTransaction(hash);
      if (tx.status === 'SUCCESS') return tx;
      if (tx.status === 'FAILED') {
        const result = (tx as rpc.Api.GetFailedTransactionResponse).resultXdr;
        throw new SorobanError(
          `Transaction ${hash} failed on-chain: ${
            result ? result.toXDR('base64') : 'no result XDR'
          }`,
        );
      }
      if (Date.now() - started > timeoutMs) {
        throw new SorobanError(
          `Timed out waiting for transaction ${hash} to settle`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  /** Submit a state-changing contract call and wait for it to settle. */
  async invoke(options: SorobanInvokeOptions): Promise<SorobanInvokeReceipt> {
    const { contractId, method, args, signerSecret } = options;
    const signer = Keypair.fromSecret(signerSecret);
    const contract = new Contract(contractId);
    const source = await this.server.getAccount(signer.publicKey());
    const fee = options.fee ?? this.defaultFee();

    const tx = new TransactionBuilder(source, {
      fee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    tx.sign(signer);

    const send = await this.server.sendTransaction(tx);
    if (send.status === 'ERROR') {
      const errorResult = send.errorResult?.toXDR('base64') ?? 'no error result';
      throw new SorobanError(
        `Contract call ${method} rejected: ${errorResult}`,
      );
    }

    this.logger.log(`Contract call ${method} submitted, tx=${send.hash}`);

    const receipt = await this.waitForReceipt(send.hash);
    const returnValue = receipt.returnValue
      ? scValToNative(receipt.returnValue)
      : null;

    return { hash: send.hash, status: 'SUCCESS', returnValue };
  }

  /** Read-only contract call executed via simulation (no fee, no submission). */
  async read(options: SorobanReadOptions): Promise<unknown> {
    const rv = await this.readScVal(options);
    return rv === null ? null : scValToNative(rv);
  }

  /** Read-only contract call returning the raw `ScVal` for custom decoding. */
  async readScVal(options: SorobanReadOptions): Promise<RawScVal | null> {
    const { contractId, method, args, source } = options;
    const sourceAccount = source
      ? new Account(source, '0')
      : this.readSourceAccount();

    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(0)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new SorobanError(
        `Contract read ${method} failed: ${sim.error}`,
      );
    }
    const result = sim.result;
    if (!result) {
      throw new SorobanError(
        `Contract read ${method} returned no result`,
      );
    }
    return result.retval;
  }

  private readSourceAccount(): Account {
    const secret = this.config.get<string>('STELLAR_ADMIN_SECRET_KEY');
    if (secret) {
      try {
        return new Account(Keypair.fromSecret(secret).publicKey(), '0');
      } catch {
        // fall through to public-key config below
      }
    }
    const pub = this.config.get<string>('STELLAR_ADMIN_PUBLIC_KEY');
    if (!pub) {
      throw new SorobanError(
        'STELLAR_ADMIN_SECRET_KEY or STELLAR_ADMIN_PUBLIC_KEY must be configured',
      );
    }
    return new Account(pub, '0');
  }
}
