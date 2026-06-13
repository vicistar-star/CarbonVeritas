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
export async function getHealth(): Promise<{ status: string; version: string; network: string }> {
  const res = await getApi().get('/health');
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
