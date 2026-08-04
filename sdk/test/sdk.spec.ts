import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { CarbonVeritasClient } from '../src/client';
import { AdminModule } from '../src/admin';
import { WebhooksModule } from '../src/webhooks';

interface RecordedRequest {
  method?: string;
  url?: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

function makeHarness() {
  const requests: RecordedRequest[] = [];

  const adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    requests.push({
      method: config.method,
      url: config.url,
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      params: config.params as Record<string, unknown>,
      headers: config.headers as Record<string, string>,
    });

    let data: unknown;
    const url = config.url ?? '';
    const method = config.method;
    if (url.endsWith('/auth/token')) {
      data = { accessToken: 'jwt-test-token', refreshToken: 'refresh-token' };
    } else if (url.endsWith('/auth/challenge')) {
      data = { challengeId: 'challenge-1', transaction: 'AAAAAA==' };
    } else if (url.endsWith('/admin/config') && method === 'patch') {
      data = true;
    } else if (url.endsWith('/admin/verifiers/remove')) {
      data = true;
    } else if (url.endsWith('/admin/verifiers')) {
      data = [{ address: 'GADMIN' }];
    } else if (url.endsWith('/admin/system')) {
      data = {
        network: { connected: true, sequence: 1234 },
        counts: { users: 1, credits: 2, verifiers: 1, offers: 0, retirements: 0, webhooks: 2 },
      };
    } else if (url.endsWith('/webhooks/deliveries')) {
      data = [
        {
          id: 'delivery-1',
          webhookId: 'wh-1',
          eventType: 'credit.approved',
          payload: {},
          success: true,
          attempts: 1,
          statusCode: 200,
          durationMs: 42,
          error: null,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ];
    } else if (url.includes('/webhooks/')) {
      data = { ok: true };
    } else if (url.endsWith('/webhooks') && method === 'post') {
      data = {
        id: 'wh-1',
        url: 'https://example.com/hook',
        events: ['credit.approved', 'credit.minted'],
        active: true,
        createdAt: '2026-08-01T00:00:00.000Z',
      };
    } else if (url.endsWith('/webhooks')) {
      data = [
        {
          id: 'wh-1',
          url: 'https://example.com/hook',
          events: ['credit.approved'],
          active: true,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ];
    } else {
      data = {};
    }

    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };

  const client = new CarbonVeritasClient({ apiUrl: 'http://api.test', adapter });
  return { client, requests };
}

describe('CarbonVeritasClient', () => {
  it('requests a SEP-10 challenge for a wallet address', async () => {
    const { client, requests } = makeHarness();
    const challenge = await client.requestChallenge('GABCDE');

    expect(challenge).toEqual({ challengeId: 'challenge-1', transaction: 'AAAAAA==' });
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/auth/challenge');
    expect(requests[0].data).toEqual({ wallet: 'GABCDE' });
  });

  it('stores the bearer token after authentication', async () => {
    const { client, requests } = makeHarness();
    const session = await client.authenticate('GABCDE', 'SIGNED_XDR', 'challenge-1');

    expect(session.accessToken).toBe('jwt-test-token');
    expect(client.authToken).toBe('jwt-test-token');

    await client.health();
    const healthReq = requests.find((r) => r.url === '/health');
    expect(healthReq?.headers?.['Authorization']).toBe('Bearer jwt-test-token');
  });

  it('reports the configured api url and network', () => {
    const { client } = makeHarness();
    expect(client.apiUrl).toBe('http://api.test');
    expect(client.network).toBe('testnet');
  });
});

describe('AdminModule', () => {
  it('reads protocol config from /admin/config', async () => {
    const { client, requests } = makeHarness();
    const admin = new AdminModule(client);
    await admin.getProtocolConfig();

    expect(requests[0].method).toBe('get');
    expect(requests[0].url).toBe('/admin/config');
  });

  it('updates protocol config with a PATCH body', async () => {
    const { client, requests } = makeHarness();
    const admin = new AdminModule(client);
    const result = await admin.updateProtocolConfig({
      verifierThreshold: 3,
      verifierQuorum: 3,
      approvalWindow: 2592000,
      protocolFeeBps: 100,
      bufferPoolPct: 10,
    });

    expect(result).toBe(true);
    expect(requests[0].method).toBe('patch');
    expect(requests[0].url).toBe('/admin/config');
    expect(requests[0].data).toEqual({
      verifierThreshold: 3,
      verifierQuorum: 3,
      approvalWindow: 2592000,
      protocolFeeBps: 100,
      bufferPoolPct: 10,
    });
  });

  it('lists contract addresses and verifiers', async () => {
    const { client, requests } = makeHarness();
    const admin = new AdminModule(client);

    await admin.getContracts();
    const verifiers = await admin.listVerifiers();

    expect(requests[0].url).toBe('/admin/contracts');
    expect(requests[1].url).toBe('/admin/verifiers');
    expect(verifiers).toEqual([{ address: 'GADMIN' }]);
  });

  it('adds and removes verifiers via admin endpoints', async () => {
    const { client, requests } = makeHarness();
    const admin = new AdminModule(client);

    await admin.addVerifier('GVERIFIER');
    await admin.removeVerifier('GVERIFIER');

    expect(requests[0]).toMatchObject({ method: 'post', url: '/admin/verifiers', data: { address: 'GVERIFIER' } });
    expect(requests[1]).toMatchObject({ method: 'post', url: '/admin/verifiers/remove', data: { address: 'GVERIFIER' } });
  });

  it('reports system status with network and counts', async () => {
    const { client, requests } = makeHarness();
    const admin = new AdminModule(client);

    const status = await admin.getSystemStatus();

    expect(requests[0].url).toBe('/admin/system');
    expect(status.network.connected).toBe(true);
    expect(status.counts.webhooks).toBe(2);
  });
});

describe('WebhooksModule', () => {
  it('registers a webhook with url and events', async () => {
    const { client, requests } = makeHarness();
    const webhooks = new WebhooksModule(client);

    const created = await webhooks.create({
      url: 'https://example.com/hook',
      events: ['credit.approved', 'credit.minted'],
    });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/webhooks' });
    expect(created.id).toBe('wh-1');
  });

  it('lists registered webhooks', async () => {
    const { client, requests } = makeHarness();
    const webhooks = new WebhooksModule(client);

    const hooks = await webhooks.list();

    expect(requests[0]).toMatchObject({ method: 'get', url: '/webhooks' });
    expect(hooks).toHaveLength(1);
    expect(hooks[0].url).toBe('https://example.com/hook');
  });

  it('removes and tests a webhook by id', async () => {
    const { client, requests } = makeHarness();
    const webhooks = new WebhooksModule(client);

    await webhooks.remove('wh-1');
    await webhooks.test('wh-1');

    expect(requests[0]).toMatchObject({ method: 'delete', url: '/webhooks/wh-1' });
    expect(requests[1]).toMatchObject({ method: 'post', url: '/webhooks/wh-1/test' });
  });

  it('fetches delivery history with optional filters', async () => {
    const { client, requests } = makeHarness();
    const webhooks = new WebhooksModule(client);

    const deliveries = await webhooks.deliveries({ eventType: 'credit.approved', limit: 10 });

    expect(requests[0]).toMatchObject({ method: 'get', url: '/webhooks/deliveries' });
    expect(requests[0].params).toEqual({ eventType: 'credit.approved', limit: 10 });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].success).toBe(true);
  });

  it('omits empty delivery filters', async () => {
    const { client, requests } = makeHarness();
    const webhooks = new WebhooksModule(client);

    await webhooks.deliveries();

    expect(requests[0].params).toEqual({});
  });
});
