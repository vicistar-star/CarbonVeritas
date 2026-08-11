import { PrismaClient } from '@prisma/client';
import {
  processCreditSubmitted,
  CreditSubmittedEvent,
} from './processors/credit-submitted';
import { processCreditApproved, CreditApprovedEvent } from './processors/credit-approved';
import { processCreditMinted, CreditMintedEvent } from './processors/credit-minted';
import { processCreditRejected, CreditRejectedEvent } from './processors/credit-rejected';
import { processCreditTransferred, CreditTransferredEvent } from './processors/credit-transferred';
import { processCreditRetired, CreditRetiredEvent } from './processors/credit-retired';
import { processOfferCreated, OfferCreatedEvent } from './processors/offer-created';
import { processOfferFilled, OfferFilledEvent } from './processors/offer-filled';
import { processOfferCancelled, OfferCancelledEvent } from './processors/offer-cancelled';
import { processCreditBridged, CreditBridgedEvent } from './processors/credit-bridged';
import { processCreditBridgedOut, CreditBridgedOutEvent } from './processors/credit-bridged-out';
import { processRegistryRootUpdated, RegistryRootUpdatedEvent } from './processors/registry-root-updated';
import { contractIds as readContractIds } from './config';

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

export type SyncEvent =
  | { type: 'CreditSubmitted'; data: CreditSubmittedEvent }
  | { type: 'CreditApproved'; data: CreditApprovedEvent }
  | { type: 'CreditMinted'; data: CreditMintedEvent }
  | { type: 'CreditRejected'; data: CreditRejectedEvent }
  | { type: 'CreditTransferred'; data: CreditTransferredEvent }
  | { type: 'CreditRetired'; data: CreditRetiredEvent }
  | { type: 'OfferCreated'; data: OfferCreatedEvent }
  | { type: 'OfferFilled'; data: OfferFilledEvent }
  | { type: 'OfferCancelled'; data: OfferCancelledEvent }
  | { type: 'CreditBridged'; data: CreditBridgedEvent }
  | { type: 'CreditBridgedOut'; data: CreditBridgedOutEvent }
  | { type: 'RegistryRootUpdated'; data: RegistryRootUpdatedEvent };

export interface SyncCursor {
  ledgerSequence: number;
  txIndex: number;
}

interface RpcEvent {
  type?: string;
  ledger?: number;
  ledgerClosedAt?: string;
  contractId?: string;
  id?: string;
  txHash?: string;
  txIndex?: number;
  inSuccessfulContractCall?: boolean;
  topic?: string[];
  value?: Record<string, unknown>;
}

export class IndexerSync {
  private prisma: PrismaClient;
  private cursor: SyncCursor;
  private running = false;
  private pollIntervalMs: number;
  private rpcUrl: string;
  private contractIds: string[];
  private warnedNoContracts = false;

  constructor(
    prisma: PrismaClient,
    rpcUrl: string,
    pollIntervalMs = 5000,
    initialCursor?: SyncCursor,
    contractIds: string[] = [],
  ) {
    this.prisma = prisma;
    this.rpcUrl = rpcUrl;
    this.pollIntervalMs = pollIntervalMs;
    this.cursor = initialCursor ?? { ledgerSequence: 1, txIndex: 0 };
    this.contractIds =
      contractIds.length > 0 ? contractIds : readContractIds();
  }

  getCursor(): SyncCursor {
    return this.cursor;
  }

  async processEvent(event: SyncEvent): Promise<void> {
    switch (event.type) {
      case 'CreditSubmitted':
        await processCreditSubmitted(this.prisma, event.data);
        break;
      case 'CreditApproved':
        await processCreditApproved(this.prisma, event.data);
        break;
      case 'CreditMinted':
        await processCreditMinted(this.prisma, event.data);
        break;
      case 'CreditRejected':
        await processCreditRejected(this.prisma, event.data);
        break;
      case 'CreditTransferred':
        await processCreditTransferred(this.prisma, event.data);
        break;
      case 'CreditRetired':
        await processCreditRetired(this.prisma, event.data);
        break;
      case 'OfferCreated':
        await processOfferCreated(this.prisma, event.data);
        break;
      case 'OfferFilled':
        await processOfferFilled(this.prisma, event.data);
        break;
      case 'OfferCancelled':
        await processOfferCancelled(this.prisma, event.data);
        break;
      case 'CreditBridged':
        await processCreditBridged(this.prisma, event.data);
        break;
      case 'CreditBridgedOut':
        await processCreditBridgedOut(this.prisma, event.data);
        break;
      case 'RegistryRootUpdated':
        await processRegistryRootUpdated(event.data);
        break;
    }
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`[Indexer] Starting sync from ledger ${this.cursor.ledgerSequence}`);
    console.log(`[Indexer] RPC: ${this.rpcUrl}`);

    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        console.error('[Indexer] Poll error:', (err as Error).message);
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  stop(): void {
    this.running = false;
  }

  private async poll(): Promise<void> {
    const events = await this.fetchEvents();
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  private async fetchEventPage(startLedger: number): Promise<RpcEvent[]> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getEvents',
        params: {
          startLedger,
          filters: [{ type: 'contract', contractIds: this.contractIds }],
          pagination: { limit: PAGE_LIMIT },
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[Indexer] RPC returned ${response.status}`);
      return [];
    }

    const result = await response.json();
    if (result.error) {
      console.warn('[Indexer] RPC error:', result.error);
      return [];
    }

    return (result.result?.events ?? []) as RpcEvent[];
  }

  private async fetchEvents(): Promise<SyncEvent[]> {
    if (this.contractIds.length === 0) {
      if (!this.warnedNoContracts) {
        console.warn(
          '[Indexer] No contracts configured; indexer is idle. Set INDEXER_*_CONTRACT env vars.',
        );
        this.warnedNoContracts = true;
      }
      return [];
    }

    const events: SyncEvent[] = [];
    const { ledgerSequence, txIndex } = this.cursor;
    let seen: SyncCursor = { ledgerSequence, txIndex };
    let startLedger = ledgerSequence;
    let pageCount = 0;
    let drained = false;
    let sawEvents = false;

    for (; pageCount < MAX_PAGES; pageCount++) {
      const page = await this.fetchEventPage(startLedger);
      if (page.length === 0) {
        drained = true;
        break;
      }

      for (const rpcEvent of page) {
        if (rpcEvent.inSuccessfulContractCall === false) continue;

        const evLedger = Number(rpcEvent.ledger ?? seen.ledgerSequence);
        const evTxIndex = Number(rpcEvent.txIndex ?? 0);
        if (
          evLedger < seen.ledgerSequence ||
          (evLedger === seen.ledgerSequence && evTxIndex <= seen.txIndex)
        ) {
          continue;
        }

        sawEvents = true;
        const parsed = this.parseRpcEvent(rpcEvent);
        if (parsed) events.push(parsed);

        if (
          evLedger > seen.ledgerSequence ||
          (evLedger === seen.ledgerSequence && evTxIndex > seen.txIndex)
        ) {
          seen = { ledgerSequence: evLedger, txIndex: evTxIndex };
        }
      }

      if (page.length < PAGE_LIMIT) {
        drained = true;
        break;
      }
      startLedger = seen.ledgerSequence;
    }

    if (drained && sawEvents) {
      this.cursor = { ledgerSequence: seen.ledgerSequence + 1, txIndex: 0 };
    } else if (
      seen.ledgerSequence > this.cursor.ledgerSequence ||
      (seen.ledgerSequence === this.cursor.ledgerSequence &&
        seen.txIndex > this.cursor.txIndex)
    ) {
      this.cursor = seen;
    }

    return events;
  }

  /**
   * Extract a number from an event payload that may arrive as a JSON-XDR
   * scval (e.g. `{ u64: { value: "7" } }`) or as a plain value.
   */
  private toNumber(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const inner = o.u64 ?? o.i128 ?? o.i256 ?? o.value ?? o;
      if (inner && typeof inner === 'object') {
        return Number((inner as Record<string, unknown>).value ?? 0);
      }
      return Number(inner ?? 0);
    }
    return Number(v ?? 0);
  }

  /**
   * Extract a string from an event payload that may be a plain string or a
   * JSON-XDR scval (e.g. an `Address`).
   */
  private toStringValue(v: unknown): string {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const container = o.address ?? o;
      if (container && typeof container === 'object') {
        const addr = container as Record<string, unknown>;
        const account = addr.account ?? (typeof addr.publicKey === 'string' ? addr : undefined);
        if (account && typeof account === 'object') {
          const inner = account as Record<string, unknown>;
          return String(inner.publicKey ?? inner.contract ?? inner.value ?? '');
        }
        const contract = addr.contract;
        if (contract && typeof contract === 'object') {
          return String((contract as Record<string, unknown>).contract_id ?? '');
        }
        return String(addr.contract_id ?? addr.publicKey ?? addr.value ?? '');
      }
      return String(o.symbol ?? o.str ?? o.bytes ?? o.value ?? '');
    }
    return String(v ?? '');
  }

  /**
   * Extract a hex string from an event payload that may be a plain hex
   * string or a JSON-XDR `BytesN` scval (`{ bytes: "0x..." }`).
   */
  private toHexValue(v: unknown): string {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return String(o.bytes ?? o.hex ?? o.value ?? '');
    }
    return String(v ?? '');
  }

  private parseRpcEvent(rpcEvent: RpcEvent): SyncEvent | null {
    try {
      const value = rpcEvent.value as Record<string, unknown> | undefined;
      const topic = (rpcEvent.topic as string[]) ?? [];
      const topicStr = topic[0] ?? '';

      if (!value) return null;

      switch (topicStr) {
        case 'bridged': {
          const creditId = this.toNumber(value);
          return {
            type: 'CreditBridged',
            data: {
              creditId,
              sourceRegistry: String(topic[1] ?? ''),
              sourceSerial: String(topic[2] ?? ''),
              txHash: String(rpcEvent.txHash ?? ''),
              timestamp: Number(rpcEvent.ledger ?? 0),
            },
          };
        }
        case 'bridge_ot': {
          const creditId = this.toNumber(topic[1]);
          return {
            type: 'CreditBridgedOut',
            data: {
              creditId,
              owner: this.toStringValue(value),
              txHash: String(rpcEvent.txHash ?? ''),
              timestamp: Number(rpcEvent.ledger ?? 0),
            },
          };
        }
        case 'root_upd': {
          return {
            type: 'RegistryRootUpdated',
            data: {
              registry: String(topic[1] ?? ''),
              root: this.toHexValue(value),
              ledgerSequence: Number(rpcEvent.ledger ?? 0),
              txHash: String(rpcEvent.txHash ?? ''),
              timestamp: Number(rpcEvent.ledger ?? 0),
            },
          };
        }
        case 'credit_submitted': {
          const v = value as Record<string, unknown>;
          return {
            type: 'CreditSubmitted',
            data: {
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              issuer: String(v.issuer ?? ''),
              projectId: String(v.project_id ?? v.projectId ?? ''),
              methodology: String(v.methodology ?? ''),
              vintageStart: String(v.vintage_start ?? v.vintageStart ?? ''),
              vintageEnd: String(v.vintage_end ?? v.vintageEnd ?? ''),
              tonnes: Number(v.tonnes ?? 0),
              geography: String(v.geography ?? ''),
              serialPrefix: String(v.serial_prefix ?? v.serialPrefix ?? ''),
              sdgFlags: Number(v.sdg_flags ?? v.sdgFlags ?? 0),
              permanenceRating: Number(v.permanence_rating ?? v.permanenceRating ?? 0),
              bufferContributionPct: Number(v.buffer_contribution_pct ?? v.bufferContributionPct ?? 0),
              additionalityType: Number(v.additionality_type ?? v.additionalityType ?? 0),
              ipfsHash: String(v.ipfs_hash ?? v.ipfsHash ?? ''),
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'credit_approved': {
          const v = value as Record<string, unknown>;
          return {
            type: 'CreditApproved',
            data: {
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              verifier: String(v.verifier ?? ''),
              approved: v.approved === true || v.approved === 'true',
              comments: v.comments ? String(v.comments) : undefined,
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'credit_minted': {
          const v = value as Record<string, unknown>;
          return {
            type: 'CreditMinted',
            data: {
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              tokenId: String(v.token_id ?? v.tokenId ?? ''),
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'credit_rejected': {
          const v = value as Record<string, unknown>;
          return {
            type: 'CreditRejected',
            data: {
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              verifier: String(v.verifier ?? ''),
              reason: String(v.reason ?? ''),
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'credit_transferred': {
          const v = value as Record<string, unknown>;
          return {
            type: 'CreditTransferred',
            data: {
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              from: String(v.from ?? ''),
              to: String(v.to ?? ''),
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'credit_retired': {
          const v = value as Record<string, unknown>;
          return {
            type: 'CreditRetired',
            data: {
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              retiredBy: String(v.retired_by ?? v.retiredBy ?? ''),
              beneficiary: String(v.beneficiary ?? ''),
              reason: String(v.reason ?? ''),
              accountingPeriod: String(v.accounting_period ?? v.accountingPeriod ?? ''),
              tonnesRetired: Number(v.tonnes_retired ?? v.tonnesRetired ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
              ledgerSequence: Number(v.ledger_sequence ?? v.ledgerSequence ?? 0),
              timestamp: Number(v.timestamp ?? 0),
            },
          };
        }
        case 'offer_created': {
          const v = value as Record<string, unknown>;
          return {
            type: 'OfferCreated',
            data: {
              offerId: Number(v.offer_id ?? v.offerId ?? 0),
              seller: String(v.seller ?? ''),
              creditId: Number(v.credit_id ?? v.creditId ?? 0),
              pricePerTonne: Number(v.price_per_tonne ?? v.pricePerTonne ?? 0),
              amount: Number(v.amount ?? 0),
              currency: String(v.currency ?? 'USDC'),
              expiresAt: v.expires_at ? Number(v.expires_at) : v.expiresAt ? Number(v.expiresAt) : undefined,
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'offer_filled': {
          const v = value as Record<string, unknown>;
          return {
            type: 'OfferFilled',
            data: {
              offerId: Number(v.offer_id ?? v.offerId ?? 0),
              buyer: String(v.buyer ?? ''),
              amount: Number(v.amount ?? 0),
              totalPrice: Number(v.total_price ?? v.totalPrice ?? 0),
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        case 'offer_cancelled': {
          const v = value as Record<string, unknown>;
          return {
            type: 'OfferCancelled',
            data: {
              offerId: Number(v.offer_id ?? v.offerId ?? 0),
              timestamp: Number(v.timestamp ?? 0),
              txHash: String(rpcEvent.txHash ?? v.txHash ?? ''),
            },
          };
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  async resyncFromGenesis(): Promise<void> {
    console.log('[Indexer] Starting full re-sync from genesis...');
    this.cursor = { ledgerSequence: 1, txIndex: 0 };
    let totalEvents = 0;

    while (this.running) {
      const events = await this.fetchEvents();
      if (events.length === 0) break;

      for (const event of events) {
        await this.processEvent(event);
        totalEvents++;
      }

      console.log(`[Indexer] Re-sync progress: ${totalEvents} events processed at ledger ${this.cursor.ledgerSequence}`);
    }

    console.log(`[Indexer] Full re-sync complete: ${totalEvents} total events`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
