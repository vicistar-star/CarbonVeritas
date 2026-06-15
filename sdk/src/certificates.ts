import { CarbonVeritasClient } from './client';
import type { Certificate } from './types';

export class CertificatesModule {
  constructor(private client: CarbonVeritasClient) {}

  async get(id: string): Promise<Certificate> {
    return this.client.get(`/certificates/${id}`);
  }

  async downloadPdf(id: string): Promise<ArrayBuffer> {
    const url = `${this.client.apiUrl}/certificates/${id}/pdf`;
    const res = await fetch(url, {
      headers: this.client.authToken
        ? { Authorization: `Bearer ${this.client.authToken}` }
        : {},
    });
    return res.arrayBuffer();
  }

  async getDownloadUrl(id: string): Promise<string> {
    return `${this.client.apiUrl}/certificates/${id}/pdf`;
  }

  async verify(certificateHash: string): Promise<{ valid: boolean; message: string }> {
    return this.client.post('/certificates/verify', { certificateHash });
  }

  async getOwned(): Promise<Certificate[]> {
    return this.client.get('/certificates/owned');
  }
}
