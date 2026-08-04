import {
  Account,
  Keypair,
  Networks,
  StrKey,
  Transaction,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { SorobanClient, SorobanError } from '../../src/stellar/soroban-client';
import { scString, scU32 } from '../../src/stellar/scval';

describe('SorobanClient', () => {
  const admin = Keypair.random();
  const contractId = StrKey.encodeContract(Buffer.alloc(32, 7));
  const config = { get: () => undefined } as never;

  const makeClient = (fakeServer: Record<string, unknown>) => {
    const client = new SorobanClient(config);
    client.setServer(fakeServer as never);
    return client;
  };

  const hostFunctionOf = (tx: Transaction) => {
    const op = tx.operations[0];
    const invoke = op.func.value();
    return {
      contractId: StrKey.encodeContract(invoke.contractAddress().value()),
      method: invoke.functionName().toString(),
      args: invoke.args().map((arg) => scValToNative(arg)),
      source: tx.source,
      sequence: tx.sequence,
    };
  };

  it('builds, signs and submits a contract call, then settles it', async () => {
    let captured: Transaction | null = null;
    const fakeServer = {
      getAccount: jest.fn().mockResolvedValue(new Account(admin.publicKey(), '123')),
      sendTransaction: jest.fn().mockImplementation((tx) => {
        captured = tx;
        return Promise.resolve({ status: 'PENDING', hash: 'tx-hash-abc' });
      }),
      getTransaction: jest
        .fn()
        .mockResolvedValueOnce({
          status: 'PENDING',
          latestLedger: 100,
          latestLedgerCloseTime: 0,
          oldestLedger: 1,
          oldestLedgerCloseTime: 0,
        })
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          returnValue: xdr.ScVal.scvU64(xdr.Uint64.fromString('42')),
        }),
      simulateTransaction: jest.fn(),
    };
    const client = makeClient(fakeServer);

    const receipt = await client.invoke({
      contractId,
      method: 'submit_credit',
      args: [scString('P-1'), scU32(3)],
      signerSecret: admin.secret(),
    });

    expect(receipt).toEqual({
      hash: 'tx-hash-abc',
      status: 'SUCCESS',
      returnValue: 42n,
    });

    expect(fakeServer.getAccount).toHaveBeenCalledWith(admin.publicKey());

    const call = hostFunctionOf(captured!);
    expect(call.contractId).toBe(contractId);
    expect(call.method).toBe('submit_credit');
    expect(call.args).toEqual(['P-1', 3]);
    expect(call.source).toBe(admin.publicKey());
    expect(captured!.signatures).toHaveLength(1);
    expect((captured as unknown as { networkPassphrase: string }).networkPassphrase).toBe(
      Networks.TESTNET,
    );
  });

  it('throws when the RPC rejects the transaction on submission', async () => {
    const fakeServer = {
      getAccount: jest.fn().mockResolvedValue(new Account(admin.publicKey(), '1')),
      sendTransaction: jest.fn().mockResolvedValue({
        status: 'ERROR',
        errorResult: { toXDR: () => 'base64-error' },
      }),
      getTransaction: jest.fn(),
      simulateTransaction: jest.fn(),
    };
    const client = makeClient(fakeServer);

    await expect(
      client.invoke({
        contractId,
        method: 'approve_and_mint',
        args: [],
        signerSecret: admin.secret(),
      }),
    ).rejects.toThrow(SorobanError);

    await expect(
      client.invoke({
        contractId,
        method: 'approve_and_mint',
        args: [],
        signerSecret: admin.secret(),
      }),
    ).rejects.toThrow('rejected');
  });

  it('throws when the transaction fails on-chain', async () => {
    const fakeServer = {
      getAccount: jest.fn().mockResolvedValue(new Account(admin.publicKey(), '1')),
      sendTransaction: jest.fn().mockResolvedValue({
        status: 'PENDING',
        hash: 'tx-failed',
      }),
      getTransaction: jest.fn().mockResolvedValue({
        status: 'FAILED',
        resultXdr: { toXDR: () => 'failed-xdr' },
      }),
      simulateTransaction: jest.fn(),
    };
    const client = makeClient(fakeServer);

    await expect(
      client.invoke({
        contractId,
        method: 'retire',
        args: [],
        signerSecret: admin.secret(),
      }),
    ).rejects.toThrow(SorobanError);
    await expect(
      client.invoke({
        contractId,
        method: 'retire',
        args: [],
        signerSecret: admin.secret(),
      }),
    ).rejects.toThrow('failed on-chain');
  });

  it('executes read-only calls via simulation and decodes the return value', async () => {
    let simulated: Transaction | null = null;
    const fakeServer = {
      getAccount: jest.fn(),
      sendTransaction: jest.fn(),
      getTransaction: jest.fn(),
      simulateTransaction: jest.fn().mockImplementation((tx) => {
        simulated = tx;
        return Promise.resolve({
          transactionData: {},
          minResourceFee: '0',
          cost: { cpuInsns: '0', memBytes: '0' },
          result: {
            retval: xdr.ScVal.scvString('bafy-hash'),
          },
        });
      }),
    };
    const client = makeClient(fakeServer);

    const value = await client.read({
      contractId,
      method: 'get_credit',
      args: [scU32(1)],
      source: admin.publicKey(),
    });

    expect(value).toBe('bafy-hash');
    const call = hostFunctionOf(simulated!);
    expect(call.contractId).toBe(contractId);
    expect(call.method).toBe('get_credit');
    expect(call.args).toEqual([1]);
  });

  it('throws a descriptive error when simulation fails', async () => {
    const fakeServer = {
      getAccount: jest.fn(),
      sendTransaction: jest.fn(),
      getTransaction: jest.fn(),
      simulateTransaction: jest.fn().mockResolvedValue({ error: 'host error' }),
    };
    const client = makeClient(fakeServer);

    await expect(
      client.read({
        contractId,
        method: 'get_credit',
        args: [],
        source: admin.publicKey(),
      }),
    ).rejects.toThrow('get_credit failed: host error');
  });

  it('uses the configured network passphrase', () => {
    const client = new SorobanClient({
      get: (key: string) =>
        key === 'STELLAR_NETWORK_PASSPHRASE' ? Networks.PUBLIC : undefined,
    } as never);
    expect(client.networkPassphrase).toBe(Networks.PUBLIC);
    expect(client.rpcUrl).toBe('https://soroban-testnet.stellar.org');
  });
});
