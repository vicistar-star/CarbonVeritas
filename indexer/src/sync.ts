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

export type SyncEvent =
  | { type: 'CreditSubmitted'; data: CreditSubmittedEvent }
  | { type: 'CreditApproved'; data: CreditApprovedEvent }
  | { type: 'CreditMinted'; data: CreditMintedEvent }
  | { type: 'CreditRejected'; data: CreditRejectedEvent }
  | { type: 'CreditTransferred'; data: CreditTransferredEvent }
  | { type: 'CreditRetired'; data: CreditRetiredEvent }
  | { type: 'OfferCreated'; data: OfferCreatedEvent }
  | { type: 'OfferFilled'; data: OfferFilledEvent }
  | { type: 'OfferCancelled'; data: OfferCancelledEvent };

export interface SyncCursor {
  ledgerSequence: number;
  txIndex: number;
}

export class IndexerSync {
  private prisma: PrismaClient;
  private cursor: SyncCursor;
  private running = false;
  private pollIntervalMs: number;
  private rpcUrl: string;

  constructor(
    prisma: PrismaClient,
    rpcUrl: string,
    pollIntervalMs = 5000,
    initialCursor?: SyncCursor,
  ) {
    this.prisma = prisma;
    this.rpcUrl = rpcUrl;
    this.pollIntervalMs = pollIntervalMs;
    this.cursor = initialCursor ?? { ledgerSequence: 1, txIndex: 0 };
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

  private async fetchEvents(): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getEvents',
          params: {
            startLedger: this.cursor.ledgerSequence,
            filters: [
              { type: 'contract', contractIds: [] },
            ],
            pagination: { limit: 100 },
          },
        }),
      });

      if (!response.ok) {
        console.warn(`[Indexer] RPC returned ${response.status}`);
        return events;
      }

      const result = await response.json();
      if (result.error) {
        console.warn('[Indexer] RPC error:', result.error);
        return events;
      }

      const rpcEvents = result.result?.events ?? [];
      for (const rpcEvent of rpcEvents) {
        const parsed = this.parseRpcEvent(rpcEvent);
        if (parsed) {
          events.push(parsed);
          this.cursor.ledgerSequence = Math.max(
            this.cursor.ledgerSequence,
            rpcEvent.ledger ?? this.cursor.ledgerSequence,
          );
        }
      }
    } catch (err) {
      console.error('[Indexer] Failed to fetch events:', (err as Error).message);
    }

    return events;
  }

  private parseRpcEvent(rpcEvent: Record<string, unknown>): SyncEvent | null {
    try {
      const value = rpcEvent.value as Record<string, unknown> | undefined;
      const topic = (rpcEvent.topic as string[]) ?? [];
      const topicStr = topic[0] ?? '';

      if (!value) return null;

      switch (topicStr) {
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
              txHash: String(rpcEvent.tx_hash ?? v.txHash ?? ''),
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
