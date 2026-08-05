import { CarbonVeritasClient } from './client';
import type { Scope3Report, Scope3ReportQuery } from './types';

/**
 * Corporate sustainability reporting. Exports the authenticated wallet's
 * retired credits as a GHG Protocol Scope 3 inventory (JSON or CSV).
 */
export class ReportingModule {
  constructor(private client: CarbonVeritasClient) {}

  async getScope3Report(query: Scope3ReportQuery = {}): Promise<Scope3Report> {
    const { format, ...params } = query;
    return this.client.get('/reporting/scope3', {
      format: format ?? 'json',
      ...(params.year ? { year: params.year } : {}),
    });
  }

  async downloadScope3Csv(query: Omit<Scope3ReportQuery, 'format'> = {}): Promise<string> {
    const url = this.buildScope3Url({ format: 'csv', ...query });
    const res = await fetch(url, {
      headers: this.client.authToken
        ? { Authorization: `Bearer ${this.client.authToken}` }
        : {},
    });
    if (!res.ok) {
      throw new Error(`Scope 3 CSV export failed with status ${res.status}`);
    }
    // Decode from bytes so the UTF-8 BOM emitted by the API survives
    // res.text() would otherwise strip it and break Excel compatibility.
    const bytes = new Uint8Array(await res.arrayBuffer());
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  }

  getScope3CsvUrl(query: Omit<Scope3ReportQuery, 'format'> = {}): string {
    return this.buildScope3Url({ format: 'csv', ...query });
  }

  private buildScope3Url(query: Scope3ReportQuery): string {
    const params = new URLSearchParams({ format: query.format ?? 'json' });
    if (query.year) params.set('year', String(query.year));
    return `${this.client.apiUrl}/reporting/scope3?${params.toString()}`;
  }
}
