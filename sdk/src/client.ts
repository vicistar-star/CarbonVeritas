import axios, { AxiosInstance } from 'axios';
import type { SdkConfig, TokenResponse } from './types';

const DEFAULT_API_URL = 'http://localhost:3000';

export class CarbonVeritasClient {
  private http: AxiosInstance;
  private _apiUrl: string;
  private _network: string;
  private _authToken: string | null = null;

  constructor(config: SdkConfig = {}) {
    this._apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this._network = config.network ?? 'testnet';

    this.http = axios.create({
      baseURL: this._apiUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.http.interceptors.request.use((req) => {
      if (this._authToken) {
        req.headers.Authorization = `Bearer ${this._authToken}`;
      }
      return req;
    });
  }

  get apiUrl(): string {
    return this._apiUrl;
  }

  get network(): string {
    return this._network;
  }

  get authToken(): string | null {
    return this._authToken;
  }

  setAuthToken(token: string | null): void {
    this._authToken = token;
  }

  async requestChallenge(wallet: string): Promise<{ challenge: string }> {
    const res = await this.http.post('/auth/challenge', { wallet });
    return res.data;
  }

  async authenticate(wallet: string, signedChallenge: string): Promise<TokenResponse> {
    const res = await this.http.post('/auth/token', { wallet, signedChallenge });
    this._authToken = res.data.accessToken;
    return res.data;
  }

  async health(): Promise<{ status: string; version: string; network: string }> {
    const res = await this.http.get('/health');
    return res.data;
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const res = await this.http.get(path, { params });
    return res.data;
  }

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    const res = await this.http.post(path, data);
    return res.data;
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const res = await this.http.delete(path);
    return res.data;
  }
}
