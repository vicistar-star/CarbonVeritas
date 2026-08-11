import { IndexerSync, SyncEvent } from '../src/sync';

function createPrismaMock(): any {
  return {
    user: {
      upsert: jest.fn(async () => ({ id: 'user-1' })),
    },
    credit: {
      upsert: jest.fn(async () => ({ id: 'credit-1' })),
      findUnique: jest.fn(async () => ({ id: 'credit-1' })),
      update: jest.fn(async () => ({})),
    },
    approval: {
      create: jest.fn(async () => ({})),
    },
    offer: {
      upsert: jest.fn(async () => ({ id: 'offer-1' })),
      findUnique: jest.fn(async () => ({
        id: 'offer-1',
        amount: 100,
        amountFilled: 0,
        creditId: 'credit-1',
      })),
      update: jest.fn(async () => ({})),
    },
    trade: {
      create: jest.fn(async () => ({})),
    },
    retirement: {
      create: jest.fn(async () => ({})),
    },
    bridgeRecord: {
      findUnique: jest.fn(async () => ({ id: 'bridge-1' })),
      findFirst: jest.fn(async () => ({ id: 'bridge-1' })),
      update: jest.fn(async () => ({})),
    },
  };
}

function rpcEvent(overrides: Record<string, unknown>) {
  return {
    type: 'contract',
    ledger: 10,
    txIndex: 0,
    txHash: 'tx-hash',
    contractId: 'C1',
    inSuccessfulContractCall: true,
    topic: [],
    value: {},
    ...overrides,
  };
}

function makeFetchMock(pages: Array<Array<Record<string, unknown>>>) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url, body });
    const events = pages.shift() ?? [];
    return {
      ok: true,
      json: async () => ({ result: { events } }),
    } as Response;
  });
  return { fetchMock, calls };
}

describe('IndexerSync', () => {
  describe('parseRpcEvent', () => {
    let sync: IndexerSync;

    beforeEach(() => {
      sync = new IndexerSync(createPrismaMock(), 'http://rpc.test');
    });

    it('maps credit_submitted topics to CreditSubmitted events', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({
          topic: ['credit_submitted'],
          value: {
            credit_id: '5',
            issuer: 'GISS',
            project_id: 'P1',
            methodology: 'M1',
            vintage_start: '2020-01-01',
            vintage_end: '2021-01-01',
            tonnes: '100',
            geography: 'Uganda',
            serial_prefix: 'SP',
            sdg_flags: '1',
            permanence_rating: '95',
            buffer_contribution_pct: '10',
            additionality_type: '0',
            ipfs_hash: 'bafy',
            timestamp: '1700000000',
          },
        }),
      );

      expect(parsed).toEqual({
        type: 'CreditSubmitted',
        data: {
          creditId: 5,
          issuer: 'GISS',
          projectId: 'P1',
          methodology: 'M1',
          vintageStart: '2020-01-01',
          vintageEnd: '2021-01-01',
          tonnes: 100,
          geography: 'Uganda',
          serialPrefix: 'SP',
          sdgFlags: 1,
          permanenceRating: 95,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'bafy',
          timestamp: 1700000000,
          txHash: 'tx-hash',
        },
      });
    });

    it.each([
      ['credit_approved', 'CreditApproved'],
      ['credit_minted', 'CreditMinted'],
      ['credit_rejected', 'CreditRejected'],
      ['credit_transferred', 'CreditTransferred'],
      ['credit_retired', 'CreditRetired'],
      ['offer_created', 'OfferCreated'],
      ['offer_filled', 'OfferFilled'],
      ['offer_cancelled', 'OfferCancelled'],
    ])('maps %s topics to %s events', (topic, expectedType) => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({ topic: [topic], value: {} }),
      );

      expect(parsed?.type).toBe(expectedType);
    });

    it('maps bridged topics to a CreditBridged event with registry and serial', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({
          topic: ['bridged', 'VERRA', 'VCS-1500-00034567-2023'],
          value: '7',
        }),
      );

      expect(parsed).toEqual({
        type: 'CreditBridged',
        data: {
          creditId: 7,
          sourceRegistry: 'VERRA',
          sourceSerial: 'VCS-1500-00034567-2023',
          txHash: 'tx-hash',
          timestamp: 10,
        },
      });
    });

    it('parses the bridged credit id from a JSON-XDR u64 value', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({
          topic: ['bridged', 'GOLD_STANDARD', 'GS-1-2'],
          value: { u64: { value: '9' } },
        }),
      );

      expect(parsed).toMatchObject({
        type: 'CreditBridged',
        data: expect.objectContaining({ creditId: 9 }),
      });
    });

    it('maps bridge_ot topics to a CreditBridgedOut event with owner', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({
          topic: ['bridge_ot', '7'],
          value: 'GOWNER',
        }),
      );

      expect(parsed).toEqual({
        type: 'CreditBridgedOut',
        data: {
          creditId: 7,
          owner: 'GOWNER',
          txHash: 'tx-hash',
          timestamp: 10,
        },
      });
    });

    it('parses the bridge_ot owner from a JSON-XDR address value', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({
          topic: ['bridge_ot', { u64: { value: '7' } }],
          value: { address: { account: { publicKey: 'GOWNER' } } },
        }),
      );

      expect(parsed).toMatchObject({
        type: 'CreditBridgedOut',
        data: expect.objectContaining({ creditId: 7, owner: 'GOWNER' }),
      });
    });

    it('maps root_upd topics to a RegistryRootUpdated event with the root hex', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({
          topic: ['root_upd', 'VERRA'],
          value: { bytes: '0x5c3d' },
        }),
      );

      expect(parsed).toEqual({
        type: 'RegistryRootUpdated',
        data: {
          registry: 'VERRA',
          root: '0x5c3d',
          ledgerSequence: 10,
          txHash: 'tx-hash',
          timestamp: 10,
        },
      });
    });

    it('returns null for unknown topics', () => {
      const parsed = (sync as unknown as { parseRpcEvent(e: unknown): SyncEvent | null }).parseRpcEvent(
        rpcEvent({ topic: ['some_other_event'], value: {} }),
      );
      expect(parsed).toBeNull();
    });
  });

  describe('fetchEvents', () => {
    it('advances the cursor past a fully consumed ledger', async () => {
      const { fetchMock, calls } = makeFetchMock([
        [
          rpcEvent({
            ledger: 7,
            txIndex: 1,
            topic: ['credit_submitted'],
            value: { credit_id: '1', issuer: 'G1', timestamp: '1' },
          }),
          rpcEvent({ ledger: 7, txIndex: 2, topic: ['some_other_event'], value: {} }),
        ],
        [],
      ]);

      const sync = new IndexerSync(
        createPrismaMock(),
        'http://rpc.test',
        5000,
        { ledgerSequence: 7, txIndex: 0 },
        ['C1'],
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const events = await (sync as unknown as { fetchEvents(): Promise<SyncEvent[]> }).fetchEvents();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('CreditSubmitted');
      expect(sync.getCursor()).toEqual({ ledgerSequence: 8, txIndex: 0 });
      expect(calls[0].body).toMatchObject({
        method: 'getEvents',
        params: {
          startLedger: 7,
          filters: [{ type: 'contract', contractIds: ['C1'] }],
        },
      });
    });

    it('skips events already covered by the cursor', async () => {
      const { fetchMock } = makeFetchMock([
        [
          rpcEvent({ ledger: 7, txIndex: 1, topic: ['credit_submitted'], value: {} }),
          rpcEvent({
            ledger: 8,
            txIndex: 0,
            topic: ['credit_submitted'],
            value: { credit_id: '2', issuer: 'G2', timestamp: '2' },
          }),
        ],
      ]);

      const sync = new IndexerSync(
        createPrismaMock(),
        'http://rpc.test',
        5000,
        { ledgerSequence: 7, txIndex: 1 },
        ['C1'],
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const events = await (sync as unknown as { fetchEvents(): Promise<SyncEvent[]> }).fetchEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'CreditSubmitted',
        data: expect.objectContaining({ creditId: 2 }),
      });
      expect(sync.getCursor()).toEqual({ ledgerSequence: 9, txIndex: 0 });
    });

    it('pauses at the cursor while pages keep coming back full', async () => {
      const fullPage = Array.from({ length: 100 }, () =>
        rpcEvent({ ledger: 9, txIndex: 0, topic: ['some_other_event'], value: {} }),
      );
      const fetchMock = jest.fn(async () => ({
        ok: true,
        json: async () => ({ result: { events: fullPage } }),
      }) as Response);

      const sync = new IndexerSync(
        createPrismaMock(),
        'http://rpc.test',
        5000,
        { ledgerSequence: 9, txIndex: 0 },
        ['C1'],
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await (sync as unknown as { fetchEvents(): Promise<SyncEvent[]> }).fetchEvents();

      expect(sync.getCursor()).toEqual({ ledgerSequence: 9, txIndex: 0 });
      expect(fetchMock).toHaveBeenCalledTimes(50);
    });

    it('does not advance the cursor on an empty ledger', async () => {
      const { fetchMock } = makeFetchMock([[]]);

      const sync = new IndexerSync(
        createPrismaMock(),
        'http://rpc.test',
        5000,
        { ledgerSequence: 7, txIndex: 0 },
        ['C1'],
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await (sync as unknown as { fetchEvents(): Promise<SyncEvent[]> }).fetchEvents();

      expect(sync.getCursor()).toEqual({ ledgerSequence: 7, txIndex: 0 });
    });

    it('stays idle without configured contracts and never calls RPC', async () => {
      const fetchMock = jest.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const sync = new IndexerSync(createPrismaMock(), 'http://rpc.test');

      const events = await (sync as unknown as { fetchEvents(): Promise<SyncEvent[]> }).fetchEvents();

      expect(events).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('processEvent', () => {
    it('routes CreditSubmitted to the processor', async () => {
      const prisma = createPrismaMock();
      const sync = new IndexerSync(prisma, 'http://rpc.test');

      await sync.processEvent({
        type: 'CreditSubmitted',
        data: {
          creditId: 1,
          issuer: 'G1',
          projectId: 'P1',
          methodology: 'M1',
          vintageStart: '2020-01-01',
          vintageEnd: '2021-01-01',
          tonnes: 100,
          geography: 'UG',
          serialPrefix: 'SP',
          sdgFlags: 0,
          permanenceRating: 90,
          bufferContributionPct: 10,
          additionalityType: 0,
          ipfsHash: 'bafy',
          timestamp: 1,
          txHash: 'tx',
        },
      });

      expect(prisma.user.upsert).toHaveBeenCalled();
      expect(prisma.credit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ creditId: 1, tonnes: 100 }),
        }),
      );
    });

    it('routes CreditRetired to the processor', async () => {
      const prisma = createPrismaMock();
      const sync = new IndexerSync(prisma, 'http://rpc.test');

      await sync.processEvent({
        type: 'CreditRetired',
        data: {
          creditId: 1,
          retiredBy: 'G1',
          beneficiary: 'B',
          reason: 'R',
          accountingPeriod: '2024',
          tonnesRetired: 5,
          txHash: 'tx',
          ledgerSequence: 9,
          timestamp: 1,
        },
      });

      expect(prisma.retirement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tonnesRetired: 5, ledgerSequence: 9 }),
        }),
      );
    });

    it('routes OfferFilled to the processor', async () => {
      const prisma = createPrismaMock();
      const sync = new IndexerSync(prisma, 'http://rpc.test');

      await sync.processEvent({
        type: 'OfferFilled',
        data: {
          offerId: 3,
          buyer: 'G1',
          amount: 40,
          totalPrice: 400,
          timestamp: 1,
          txHash: 'tx',
        },
      });

      expect(prisma.trade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 40 }),
        }),
      );
    });

    it('routes CreditBridged to confirm the inbound ledger entry', async () => {
      const prisma = createPrismaMock();
      const sync = new IndexerSync(prisma, 'http://rpc.test');

      await sync.processEvent({
        type: 'CreditBridged',
        data: {
          creditId: 7,
          sourceRegistry: 'VERRA',
          sourceSerial: 'VCS-1500-00034567-2023',
          txHash: 'tx-bridged',
          timestamp: 10,
        },
      });

      expect(prisma.bridgeRecord.findUnique).toHaveBeenCalledWith({
        where: {
          sourceRegistry_sourceSerial: {
            sourceRegistry: 'VERRA',
            sourceSerial: 'VCS-1500-00034567-2023',
          },
        },
      });
      expect(prisma.bridgeRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bridge-1' },
          data: expect.objectContaining({ status: 'INBOUND', txHash: 'tx-bridged' }),
        }),
      );
    });

    it('routes CreditBridgedOut to retire the credit and flip the ledger entry', async () => {
      const prisma = createPrismaMock();
      const sync = new IndexerSync(prisma, 'http://rpc.test');

      await sync.processEvent({
        type: 'CreditBridgedOut',
        data: {
          creditId: 7,
          owner: 'GOWNER',
          txHash: 'tx-bridge-out',
          timestamp: 11,
        },
      });

      expect(prisma.credit.update).toHaveBeenCalledWith({
        where: { creditId: 7 },
        data: { status: 'RETIRED' },
      });
      expect(prisma.bridgeRecord.findFirst).toHaveBeenCalledWith({
        where: { creditId: 7 },
      });
      expect(prisma.bridgeRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'OUTBOUND', txHash: 'tx-bridge-out' }),
        }),
      );
    });

    it('routes RegistryRootUpdated to the logging processor', async () => {
      const prisma = createPrismaMock();
      const sync = new IndexerSync(prisma, 'http://rpc.test');

      await expect(
        sync.processEvent({
          type: 'RegistryRootUpdated',
          data: {
            registry: 'VERRA',
            root: '0x5c3d',
            ledgerSequence: 10,
            txHash: 'tx-root',
            timestamp: 10,
          },
        }),
      ).resolves.toBeUndefined();
    });
  });
});
