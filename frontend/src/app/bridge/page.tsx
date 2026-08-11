'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import {
  getBridgeRecords,
  getRegistryRoot,
  bridgeCreditIn,
  bridgeCreditOut,
  publishRegistryRoot,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  AlertCircle,
  GitMerge,
  ArrowRightLeft,
  Lock,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import type { BridgeRecord, RegistryRoot, SourceRegistry } from '@/types';

const REGISTRIES: SourceRegistry[] = ['VERRA', 'GOLD_STANDARD', 'CDM', 'ACR', 'CAR', 'PLAN_VIVO'];

export default function BridgePage() {
  const { wallet } = useWallet();
  const [tab, setTab] = useState('ledger');

  return (
    <div className="container-page py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Merkle Bridge</h1>
        <p className="text-muted-foreground mt-1">
          Import credits from legacy registries (Verra, Gold Standard, CDM, ACR, CAR, Plan Vivo)
          with cryptographic proof-of-inclusion, and return them for retirement on the source registry.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ledger">Audit ledger</TabsTrigger>
          <TabsTrigger value="in">Bridge in</TabsTrigger>
          <TabsTrigger value="out">Bridge out</TabsTrigger>
          <TabsTrigger value="roots">Registry roots</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger" className="space-y-4">
          <BridgeLedger />
        </TabsContent>
        <TabsContent value="in">
          {wallet?.isConnected ? <BridgeInForm /> : <ConnectPrompt action="bridge credits onto Stellar" />}
        </TabsContent>
        <TabsContent value="out">
          {wallet?.isConnected ? <BridgeOutForm /> : <ConnectPrompt action="return credits to their source registry" />}
        </TabsContent>
        <TabsContent value="roots" className="space-y-4">
          <RegistryRoots />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConnectPrompt({ action }: { action: string }) {
  return (
    <div className="text-center py-16">
      <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-2">Wallet required</h2>
      <p className="text-muted-foreground max-w-md mx-auto">Connect your wallet to {action}.</p>
    </div>
  );
}

function BridgeLedger() {
  const [records, setRecords] = useState<BridgeRecord[]>([]);
  const [registry, setRegistry] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (registry !== 'all') filters.registry = registry;
      if (status !== 'all') filters.status = status;
      const res = await getBridgeRecords(filters);
      setRecords(res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [registry, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={registry} onValueChange={setRegistry}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Registry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All registries</SelectItem>
            {REGISTRIES.map((r) => (
              <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="INBOUND">INBOUND</SelectItem>
            <SelectItem value="OUTBOUND">OUTBOUND</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitMerge className="h-4 w-4" /> Bridge audit ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              No bridge records yet. Bridge a credit in to start the ledger.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Direction</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source registry</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serial</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bridger</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant={record.status === 'INBOUND' ? 'default' : 'outline'}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">#{record.creditId}</td>
                    <td className="px-4 py-3 font-medium">{record.sourceRegistry}</td>
                    <td className="px-4 py-3 font-mono text-xs">{record.sourceSerial}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {record.bridger ? shorten(record.bridger.stellarPub) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function BridgeInForm() {
  const [sourceRegistry, setSourceRegistry] = useState<SourceRegistry>('VERRA');
  const [sourceSerial, setSourceSerial] = useState('');
  const [leaf, setLeaf] = useState('');
  const [merkleProof, setMerkleProof] = useState('');
  const [merkleRoot, setMerkleRoot] = useState('');
  const [projectId, setProjectId] = useState('');
  const [methodology, setMethodology] = useState('');
  const [vintageStart, setVintageStart] = useState('');
  const [vintageEnd, setVintageEnd] = useState('');
  const [tonnes, setTonnes] = useState('');
  const [geography, setGeography] = useState('');
  const [serialPrefix, setSerialPrefix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BridgeRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const record = await bridgeCreditIn({
        sourceRegistry,
        sourceSerial,
        leaf,
        merkleProof: merkleProof
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        merkleRoot,
        metadata: {
          projectId,
          methodology,
          vintageStart: Number(vintageStart),
          vintageEnd: Number(vintageEnd),
          tonnes: Number(tonnes),
          geography,
          serialPrefix,
        },
      });
      setResult(record);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" /> Bridge in — import a credit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="font-medium">
              Credit #{result.creditId} bridged in from {result.sourceRegistry}
            </p>
            <p className="text-muted-foreground text-xs break-all font-mono">{result.txHash}</p>
            <Button variant="outline" onClick={() => setResult(null)}>Bridge another</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Source registry">
                <Select value={sourceRegistry} onValueChange={(v) => setSourceRegistry(v as SourceRegistry)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGISTRIES.map((r) => (
                      <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Source serial">
                <Input value={sourceSerial} onChange={(e) => setSourceSerial(e.target.value)} placeholder="VCS-1500-00034567-2023" />
              </Field>
              <Field label="Merkle leaf (hex)">
                <Input value={leaf} onChange={(e) => setLeaf(e.target.value)} placeholder="64-char hex" className="font-mono" />
              </Field>
              <Field label="Merkle root (hex)">
                <Input value={merkleRoot} onChange={(e) => setMerkleRoot(e.target.value)} placeholder="64-char hex" className="font-mono" />
              </Field>
              <Field label="Merkle proof (comma-separated)">
                <Input value={merkleProof} onChange={(e) => setMerkleProof(e.target.value)} placeholder="sibling hashes" className="font-mono" />
              </Field>
              <Field label="Project id">
                <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="VCS-1500-AMZ-001" />
              </Field>
              <Field label="Methodology">
                <Input value={methodology} onChange={(e) => setMethodology(e.target.value)} placeholder="VCS:VM0007" />
              </Field>
              <Field label="Geography (ISO alpha-2)">
                <Input value={geography} onChange={(e) => setGeography(e.target.value)} placeholder="BR" />
              </Field>
              <Field label="Vintage start (unix s)">
                <Input value={vintageStart} onChange={(e) => setVintageStart(e.target.value)} placeholder="1704067200" className="font-mono" />
              </Field>
              <Field label="Vintage end (unix s)">
                <Input value={vintageEnd} onChange={(e) => setVintageEnd(e.target.value)} placeholder="1735689600" className="font-mono" />
              </Field>
              <Field label="Tonnes (millitonnes)">
                <Input value={tonnes} onChange={(e) => setTonnes(e.target.value)} placeholder="10000000" className="font-mono" />
              </Field>
              <Field label="Serial prefix">
                <Input value={serialPrefix} onChange={(e) => setSerialPrefix(e.target.value)} placeholder="VCS-1500-" />
              </Field>
            </div>

            {error && (
              <div className="text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !sourceSerial || !leaf || !merkleProof || !merkleRoot}
              className="w-full md:w-auto"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Bridge in
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BridgeOutForm() {
  const [creditId, setCreditId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BridgeRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      setResult(await bridgeCreditOut(Number(creditId)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" /> Bridge out — return to source registry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Return an imported credit to its source registry for retirement there. The on-chain credit
          is permanently retired to prevent double-counting.
        </p>
        {result ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="font-medium">Credit #{result.creditId} bridged back to {result.sourceRegistry}</p>
            <p className="text-muted-foreground text-xs break-all font-mono">{result.txHash}</p>
            <Button variant="outline" onClick={() => setResult(null)}>Return another</Button>
          </div>
        ) : (
          <>
            <div className="max-w-sm space-y-2">
              <label className="text-sm font-medium">Credit id</label>
              <Input value={creditId} onChange={(e) => setCreditId(e.target.value)} placeholder="7" className="font-mono" />
            </div>
            {error && (
              <div className="text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <Button onClick={handleSubmit} disabled={submitting || !creditId}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Bridge out
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RegistryRoots() {
  const { wallet } = useWallet();
  const [roots, setRoots] = useState<Record<string, RegistryRoot>>({});
  const [selected, setSelected] = useState<SourceRegistry>('VERRA');
  const [newRoot, setNewRoot] = useState('');
  const [blockHeight, setBlockHeight] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);

  const loadRoots = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(
        REGISTRIES.map(async (r) => {
          try {
            return { registry: r, root: await getRegistryRoot(r) };
          } catch {
            return { registry: r, root: null };
          }
        }),
      );
      const map: Record<string, RegistryRoot> = {};
      for (const entry of entries) {
        if (entry.root) map[entry.registry] = entry.root;
      }
      setRoots(map);
    } catch {
      setError('Failed to load registry roots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoots();
  }, [loadRoots]);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    setPublished(null);
    try {
      await publishRegistryRoot(selected, {
        root: newRoot,
        blockHeight: Number(blockHeight),
      });
      setPublished(`Root published for ${selected}`);
      setNewRoot('');
      setBlockHeight('');
      await loadRoots();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REGISTRIES.map((r) => {
          const root = roots[r];
          return (
            <Card key={r}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.replace('_', ' ')}</span>
                  {root ? (
                    <Badge>published</Badge>
                  ) : (
                    <Badge variant="outline">not set</Badge>
                  )}
                </div>
                {root ? (
                  <div className="mt-3 space-y-1 text-xs">
                    <p className="font-mono break-all text-muted-foreground">{shorten(root.root, 24)}</p>
                    <p className="text-muted-foreground">
                      Block {root.blockHeight.toLocaleString()} · {new Date(root.updatedAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No merkle root published on-chain.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {wallet?.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish a registry root</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Publish a new merkle root for a registry (requires an admin wallet).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Registry">
                <Select value={selected} onValueChange={(v) => setSelected(v as SourceRegistry)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGISTRIES.map((r) => (
                      <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Root (hex)">
                <Input value={newRoot} onChange={(e) => setNewRoot(e.target.value)} placeholder="64-char hex" className="font-mono" />
              </Field>
              <Field label="Block height">
                <Input value={blockHeight} onChange={(e) => setBlockHeight(e.target.value)} placeholder="24150000" className="font-mono" />
              </Field>
            </div>
            {error && (
              <div className="text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {published && (
              <div className="text-primary text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {published}
              </div>
            )}
            <Button onClick={handlePublish} disabled={publishing || !newRoot || !blockHeight}>
              {publishing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Publish root
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function shorten(value: string, max = 10): string {
  if (!value || value.length <= max * 2 + 1) return value ?? '';
  return `${value.slice(0, max)}…${value.slice(-max)}`;
}
