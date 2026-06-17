import { expect, test, type Page } from '@playwright/test';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function mockCarbonApi(page: Page) {
  await page.route(`${apiBase}/credits**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/credits/owned') {
      return route.fulfill({
        json: [
          {
            id: 'credit-db-1',
            creditId: 101,
            projectId: 'AMZ-101',
            methodology: 'VCS:VM0007',
            geography: 'BR',
            vintageStart: '2025-01-01',
            vintageEnd: '2025-12-31',
            tonnes: 100,
            status: 'ACTIVE',
            createdAt: '2026-06-16T00:00:00.000Z',
          },
        ],
      });
    }
    return route.fulfill({
      json: {
        data: [
          {
            id: 'credit-db-1',
            creditId: 101,
            projectId: 'AMZ-101',
            methodology: 'VCS:VM0007',
            geography: 'BR',
            vintageStart: '2025-01-01',
            vintageEnd: '2025-12-31',
            tonnes: 100,
            status: 'ACTIVE',
            createdAt: '2026-06-16T00:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    });
  });

  await page.route(`${apiBase}/marketplace/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/stats')) {
      return route.fulfill({ json: { totalVolume: 1200, vwap: 12, openInterest: 100, totalListings: 1 } });
    }
    if (url.pathname.endsWith('/price-history')) {
      return route.fulfill({ json: { data: [{ date: '2026-06-16', volume: 10, vwap: 12, tradeCount: 1 }] } });
    }
    if (url.pathname.endsWith('/listings')) {
      return route.fulfill({
        json: {
          data: [
            {
              id: 'offer-db-1',
              offerId: 22,
              pricePerTonne: 12,
              amount: 50,
              amountFilled: 0,
              currency: 'USDC',
              status: 'ACTIVE',
              credit: { creditId: 101, projectId: 'AMZ-101', methodology: 'VCS:VM0007', geography: 'BR' },
              seller: { stellarPub: 'GSELLER' },
            },
          ],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      });
    }
    return route.fulfill({ json: { ok: true } });
  });

  await page.route(`${apiBase}/certificates/**`, async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ json: { valid: true, message: 'verified' } });
    }
    return route.fulfill({
      json: {
        id: 'certificate-101',
        certificateHash: 'hash-101',
        txHash: 'tx-101',
        pdfUrl: null,
        metadata: {},
        createdAt: '2026-06-16T00:00:00.000Z',
        owner: 'GOWNER',
        retirement: {
          beneficiary: 'Acme',
          tonnesRetired: 100,
          reason: 'Offset',
          credit: {
            methodology: 'VCS:VM0007',
            geography: 'BR',
            vintageStart: '2025-01-01',
            vintageEnd: '2025-12-31',
          },
        },
      },
    });
  });

  await page.route(`${apiBase}/verifiers**`, async (route) => {
    return route.fulfill({
      json: [
        {
          id: 'verifier-1',
          status: 'ACTIVE',
          stake: 50000,
          reputation: 90,
          user: { stellarPub: 'GVERIFIER' },
        },
      ],
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockCarbonApi(page);
});

test('wallet-gated retirement flow prompts before connection', async ({ page }) => {
  await page.goto('/retire');

  await expect(page.getByRole('heading', { name: 'Retire Credits' })).toBeVisible();
  await expect(page.getByText('Connect your wallet to retire carbon credits.')).toBeVisible();
});

test('credit browsing supports filtering UI', async ({ page }) => {
  await page.goto('/credits');

  await expect(page.getByRole('heading', { name: 'Carbon Credits' })).toBeVisible();
  await expect(page.getByText('AMZ-101')).toBeVisible();
  await page.getByPlaceholder('Search methodology...').fill('VCS');
  await expect(page.getByText('VCS:VM0007')).toBeVisible();
});

test('marketplace renders buy and sell surface data', async ({ page }) => {
  await page.goto('/marketplace');

  await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
  await expect(page.getByText('Total Volume')).toBeVisible();
  await expect(page.getByText('VCS:VM0007')).toBeVisible();
});

test('certificate verification page verifies mocked on-chain hash', async ({ page }) => {
  await page.goto('/certificates/certificate-101');

  await expect(page.getByRole('heading', { name: /Certificate #/ })).toBeVisible();
  await page.getByRole('button', { name: /Verify On-Chain/ }).click();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
});

test('verifier approval flow is wallet-gated before review actions', async ({ page }) => {
  await page.goto('/verifier');

  await expect(page.getByRole('heading', { name: 'Verifier Dashboard' })).toBeVisible();
  await expect(page.getByText('Connect your wallet to access the verifier dashboard.')).toBeVisible();
});
