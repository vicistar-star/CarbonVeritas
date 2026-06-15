import { PrismaClient } from '@prisma/client';
import { IndexerSync, SyncCursor } from './sync';

const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';
const DEFAULT_PORT = 3001;
const POLL_INTERVAL_MS = Number(process.env.INDEXER_POLL_INTERVAL_MS ?? '5000');
const RPC_URL = process.env.STELLAR_RPC_URL ?? DEFAULT_RPC_URL;
const PORT = Number(process.env.INDEXER_PORT ?? DEFAULT_PORT);

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('[Indexer] Connected to database');
  } catch (err) {
    console.error('[Indexer] Failed to connect to database:', (err as Error).message);
    process.exit(1);
  }

  const initialCursor: SyncCursor | undefined = process.env.INDEXER_CURSOR
    ? JSON.parse(process.env.INDEXER_CURSOR)
    : undefined;

  const sync = new IndexerSync(prisma, RPC_URL, POLL_INTERVAL_MS, initialCursor);

  const resync = process.env.INDEXER_RESYNC === 'true';
  if (resync) {
    try {
      await sync.resyncFromGenesis();
    } catch (err) {
      console.error('[Indexer] Re-sync failed:', (err as Error).message);
    }
  }

  const http = await startHealthServer(sync);

  console.log(`[Indexer] Starting poll loop (every ${POLL_INTERVAL_MS}ms)`);
  sync.start().catch((err) => {
    console.error('[Indexer] Sync error:', err);
  });

  const shutdown = async () => {
    console.log('[Indexer] Shutting down...');
    sync.stop();
    http.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startHealthServer(sync: IndexerSync) {
  const http = await import('http');

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const cursor = sync.getCursor();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'indexer',
          ledgerSequence: cursor.ledgerSequence,
          rpcUrl: RPC_URL,
          pollIntervalMs: POLL_INTERVAL_MS,
        }),
      );
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log(`[Indexer] Health check server listening on port ${PORT}`);
  });

  return server;
}

main().catch((err) => {
  console.error('[Indexer] Fatal error:', err);
  process.exit(1);
});
