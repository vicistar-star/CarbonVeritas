import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  Credit,
  Offer,
  Trade,
  Retirement,
  Certificate,
  Verifier,
  PaginatedResponse,
  MarketplaceStats,
  ProtocolStats,
  DeepHealth,
  AuthChallenge,
  AuthSession,
  Webhook,
  WebhookDelivery,
  ProtocolConfig,
  AdminContracts,
  SystemStatus,
  Scope3Report,
} from '@/types';

let apiInstance: AxiosInstance | null = null;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function createApiClient(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}

export function getApi(): AxiosInstance {
  if (!apiInstance) {
    apiInstance = createApiClient();
  }
  return apiInstance;
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

// Health
export async function getHealth(): Promise<DeepHealth> {
  const res = await getApi().get('/health');
  return res.data;
}

// SEP-10 Auth
export async function requestAuthChallenge(wallet: string): Promise<AuthChallenge> {
  const res = await getApi().post('/auth/challenge', { wallet });
  return res.data;
}

export async function submitAuthChallenge(
  wallet: string,
  signedChallenge: string,
  challengeId: string,
): Promise<AuthSession> {
  const res = await getApi().post('/auth/token', { wallet, signedChallenge, challengeId });
  return res.data;
}

// Webhooks
export async function listWebhooks(): Promise<Webhook[]> {
  const res = await getApi().get('/webhooks');
  return res.data;
}

export async function createWebhook(data: { url: string; events: string[] }): Promise<Webhook> {
  const res = await getApi().post('/webhooks', data);
  return res.data;
}

export async function deleteWebhook(id: string): Promise<Record<string, unknown>> {
  const res = await getApi().delete(`/webhooks/${id}`);
  return res.data;
}

export async function testWebhook(id: string): Promise<Record<string, unknown>> {
  const res = await getApi().post(`/webhooks/${id}/test`);
  return res.data;
}

export async function listWebhookDeliveries(limit = 50): Promise<WebhookDelivery[]> {
  const res = await getApi().get('/webhooks/deliveries', { params: { limit } });
  return res.data;
}

// Admin
export async function getProtocolConfig(): Promise<ProtocolConfig> {
  const res = await getApi().get('/admin/config');
  return res.data;
}

export async function updateProtocolConfig(
  data: Partial<ProtocolConfig>,
): Promise<boolean> {
  const res = await getApi().patch('/admin/config', data);
  return res.data;
}

export async function getAdminContracts(): Promise<AdminContracts> {
  const res = await getApi().get('/admin/contracts');
  return res.data;
}

export async function getAdminVerifiers(): Promise<Array<Record<string, unknown>>> {
  const res = await getApi().get('/admin/verifiers');
  return res.data;
}

export async function addAdminVerifier(address: string): Promise<Record<string, unknown>> {
  const res = await getApi().post('/admin/verifiers', { address });
  return res.data;
}

export async function removeAdminVerifier(address: string): Promise<Record<string, unknown>> {
  const res = await getApi().post('/admin/verifiers/remove', { address });
  return res.data;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const res = await getApi().get('/admin/system');
  return res.data;
}

// Credits
export async function getCredits(filters?: Record<string, string>): Promise<PaginatedResponse<Credit>> {
  const res = await getApi().get('/credits', { params: filters });
  return res.data;
}

export async function getCredit(id: number): Promise<Credit> {
  const res = await getApi().get(`/credits/${id}`);
  return res.data;
}

export async function getProvenance(id: number): Promise<Array<{ type: string; timestamp: string; actor: string }>> {
  const res = await getApi().get(`/credits/${id}/provenance`);
  return res.data;
}

export async function getOwnedCredits(): Promise<Credit[]> {
  const res = await getApi().get('/credits/owned');
  return res.data;
}

export async function issueCredit(data: Record<string, unknown>): Promise<Credit> {
  const res = await getApi().post('/credits/issue', data);
  return res.data;
}

export async function approveCredit(id: number, comments?: string): Promise<Credit> {
  const res = await getApi().post(`/credits/${id}/approve`, { comments });
  return res.data;
}

export async function rejectCredit(id: number, reason: string): Promise<Credit> {
  const res = await getApi().post(`/credits/${id}/reject`, { reason });
  return res.data;
}

// Marketplae
export async function getListings(filters?: Record<string, string>): Promise<PaginatedResponse<Offer>> {
  const res = await getApi().get('/marketplace/listings', { params: filters });
  return res.data;
}

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const res = await getApi().get('/marketplace/stats');
  return res.data;
}

export async function createOffer(data: Record<string, unknown>): Promise<Offer> {
  const res = await getApi().post('/marketplace/offer', data);
  return res.data;
}

export async function buyCredits(offerId: number, amount?: number): Promise<Record<string, unknown>> {
  const res = await getApi().post(`/marketplace/buy/${offerId}`, { amount });
  return res.data;
}

export async function cancelOffer(offerId: number): Promise<Record<string, unknown>> {
  const res = await getApi().delete(`/marketplace/offer/${offerId}`);
  return res.data;
}

// Retirement
export async function retireCredit(
  creditId: number,
  data: { beneficiary: string; reason: string; accountingPeriod: string; tonnesRetired?: string },
): Promise<Retirement> {
  const res = await getApi().post(`/credits/${creditId}/retire`, data);
  return res.data;
}

export async function getCertificate(creditId: number): Promise<Record<string, unknown>> {
  const res = await getApi().get(`/credits/${creditId}/certificate`);
  return res.data;
}

// Certificates
export async function getCertificateById(id: string): Promise<Certificate> {
  const res = await getApi().get(`/certificates/${id}`);
  return res.data;
}

export async function getCertificatePdfUrl(id: string): Promise<string> {
  return `${getApi().defaults.baseURL}/certificates/${id}/pdf`;
}

export async function getOwnedCertificates(): Promise<Certificate[]> {
  const res = await getApi().get('/certificates/owned');
  return res.data;
}

export async function verifyCertificate(hash: string): Promise<Record<string, unknown>> {
  const res = await getApi().post('/certificates/verify', { certificateHash: hash });
  return res.data;
}

// Verifiers
export async function getVerifiers(): Promise<Verifier[]> {
  const res = await getApi().get('/verifiers');
  return res.data;
}

export async function registerVerifier(): Promise<Record<string, unknown>> {
  const res = await getApi().post('/verifiers/register');
  return res.data;
}

// Price History
export async function getPriceHistory(
  range: '30d' | '90d' | '1y' = '30d',
): Promise<{ data: import('@/types').PricePoint[] }> {
  const res = await getApi().get('/marketplace/price-history', { params: { range } });
  return res.data;
}

// Reporting
export async function getScope3Report(year?: number): Promise<Scope3Report> {
  const res = await getApi().get('/reporting/scope3', {
    params: year ? { format: 'json', year } : { format: 'json' },
  });
  return res.data;
}

export function getScope3CsvUrl(year?: number): string {
  const params = new URLSearchParams({ format: 'csv' });
  if (year) params.set('year', String(year));
  return `${getApi().defaults.baseURL}/reporting/scope3?${params.toString()}`;
}

export async function downloadScope3Csv(year?: number): Promise<string> {
  const res = await fetch(getScope3CsvUrl(year), {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Scope 3 CSV export failed with status ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
}

// Protocol Stats
export async function getProtocolStats(): Promise<ProtocolStats> {
  const [creditsRes, verifiersRes] = await Promise.allSettled([
    getApi().get('/credits?limit=1'),
    getApi().get('/verifiers'),
  ]);

  const totalCredits =
    creditsRes.status === 'fulfilled' ? creditsRes.value.data.meta.total : 0;
  const verifiers =
    verifiersRes.status === 'fulfilled' ? verifiersRes.value.data.length : 0;

  return {
    totalCredits,
    totalTonnesRetired: 0,
    activeVerifiers: verifiers,
    totalOffers: 0,
  };
}
