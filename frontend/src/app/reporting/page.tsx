'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getScope3Report, downloadScope3Csv } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileBarChart, Download, AlertCircle, Leaf, Layers, MapPin, Calendar } from 'lucide-react';
import type { Scope3Report as Scope3ReportType } from '@/types';

const YEAR_OPTIONS = [
  { label: 'All time', value: 'all' },
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
];

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportingPage() {
  const { wallet } = useWallet();
  const [report, setReport] = useState<Scope3ReportType | null>(null);
  const [year, setYear] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(
    async (yearValue: string) => {
      if (!wallet?.isConnected) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getScope3Report(yearValue === 'all' ? undefined : Number(yearValue));
        setReport(data);
      } catch (err) {
        setError((err as Error).message);
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [wallet],
  );

  useEffect(() => {
    if (!wallet?.isConnected) {
      setLoading(false);
      return;
    }
    loadReport(year);
  }, [wallet, year, loadReport]);

  const downloadCsv = async () => {
    const csv = await downloadScope3Csv(year === 'all' ? undefined : Number(year));
    triggerDownload(csv, `scope3-${year}.csv`, 'text/csv;charset=utf-8');
  };

  const downloadJson = () => {
    if (!report) return;
    triggerDownload(JSON.stringify(report, null, 2), `scope3-${year}.json`, 'application/json');
  };

  if (!wallet?.isConnected) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Reporting</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your wallet to export your GHG Protocol Scope 3 inventory.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const summary = report?.summary;

  return (
    <div className="container-page py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporting</h1>
          <p className="text-muted-foreground mt-1">
            GHG Protocol Scope 3 inventory of retired credits for ESG accounting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Reporting year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadCsv} disabled={!summary}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={downloadJson} disabled={!report}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      )}

      {!summary ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No retirement records found{year !== 'all' ? ` for ${year}` : ''}.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Leaf className="h-4 w-4" /> Tonnes retired
                </div>
                <p className="text-3xl font-bold mt-1">
                  {summary.totalTonnesRetired.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Layers className="h-4 w-4" /> Retirement records
                </div>
                <p className="text-3xl font-bold mt-1">{summary.totalRetirements}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" /> Unique credits
                </div>
                <p className="text-3xl font-bold mt-1">{summary.totalCredits}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BreakdownCard title="By methodology" icon={<Layers className="h-4 w-4" />} entries={summary.byMethodology} />
            <BreakdownCard title="By geography" icon={<MapPin className="h-4 w-4" />} entries={summary.byGeography} />
            <BreakdownCard title="By vintage" icon={<Calendar className="h-4 w-4" />} entries={summary.byVintage} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {report?.lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No line items in this reporting period.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credit</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Methodology</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vintage</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tonnes</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Beneficiary</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Retired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.lineItems.map((item) => (
                      <tr key={item.retirementId} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono">#{item.creditId}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.projectId}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{item.methodology}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {item.vintageStart} – {item.vintageEnd}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.tonnesRetired}</td>
                        <td className="px-4 py-3">{item.beneficiary}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(item.retirementDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function BreakdownCard({
  title,
  icon,
  entries,
}: {
  title: string;
  icon: ReactNode;
  entries: Array<{ tonnes: number; retirements: number; [dimension: string]: string | number }>;
}) {
  const dimension = Object.keys(entries[0] ?? {}).find((k) => k !== 'tonnes' && k !== 'retirements');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data.</p>
        ) : (
          <ul className="space-y-2">
            {entries.slice(0, 6).map((entry) => (
              <li key={String(entry[dimension ?? ''])} className="flex items-center justify-between text-sm">
                <span className="font-medium">{entry[dimension ?? '']}</span>
                <span className="text-muted-foreground">
                  {entry.tonnes} t · {entry.retirements} retirement{entry.retirements === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
