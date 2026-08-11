'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import {
  getVerifiers,
  getProtocolConfig,
  updateProtocolConfig,
  getSystemStatus,
  getAdminContracts,
  publishRegistryRoot,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings,
  Loader2,
  Shield,
  Users,
  Link,
  Slash,
  Gauge,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Verifier, ProtocolConfig, SystemStatus, AdminContracts } from '@/types';

export default function AdminPage() {
  const { wallet } = useWallet();
  const [verifiers, setVerifiers] = useState<Verifier[]>([]);
  const [loading, setLoading] = useState(true);

  // Config state
  const [feeBps, setFeeBps] = useState('50');
  const [threshold, setThreshold] = useState('2');
  const [quorum, setQuorum] = useState('2');
  const [approvalWindow, setApprovalWindow] = useState('2592000');
  const [bufferPct, setBufferPct] = useState('10');
  const [configSaving, setConfigSaving] = useState(false);
  const [config, setConfig] = useState<ProtocolConfig | null>(null);

  // System state
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [contracts, setContracts] = useState<AdminContracts | null>(null);

  // Verifier management
  const [showSlashDialog, setShowSlashDialog] = useState(false);
  const [slashVerifier, setSlashVerifier] = useState<Verifier | null>(null);
  const [slashAmount, setSlashAmount] = useState('');
  const [slashing, setSlashing] = useState(false);

  // Revenue split
  const [beneficiaries, setBeneficiaries] = useState<Array<{ address: string; bps: string }>>([
    { address: '', bps: '' },
  ]);

  // Oracle roots
  const [registries, setRegistries] = useState<Array<{ name: string; code: string; root: string }>>([
    { name: 'Verra', code: 'VERRA', root: '' },
    { name: 'Gold Standard', code: 'GOLD_STANDARD', root: '' },
  ]);
  const [rootBlockHeight, setRootBlockHeight] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getVerifiers(),
      getProtocolConfig(),
      getSystemStatus(),
      getAdminContracts(),
    ]).then(([v, c, s, ct]) => {
      if (v.status === 'fulfilled') setVerifiers(v.value);
      if (c.status === 'fulfilled') {
        setConfig(c.value);
        setFeeBps(String(c.value.protocolFeeBps ?? 50));
        setThreshold(String(c.value.verifierThreshold ?? 2));
        setQuorum(String(c.value.verifierQuorum ?? 2));
        setApprovalWindow(String(c.value.approvalWindow ?? 2592000));
        setBufferPct(String(c.value.bufferPoolPct ?? 10));
      }
      if (s.status === 'fulfilled') setSystem(s.value);
      if (ct.status === 'fulfilled') setContracts(ct.value);
      setLoading(false);
    });
  }, []);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setError(null);
    try {
      const updated = await updateProtocolConfig({
        verifierThreshold: Number(threshold),
        verifierQuorum: Number(quorum),
        approvalWindow: Number(approvalWindow),
        protocolFeeBps: Number(feeBps),
        bufferPoolPct: Number(bufferPct),
      });
      if (!updated) {
        setError('Failed to update protocol config on-chain.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSlash = async () => {
    if (!slashVerifier || !slashAmount) return;
    setSlashing(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      // In production: call API to slash verifier
      setShowSlashDialog(false);
      setSlashAmount('');
    } catch {
      setError('Failed to slash verifier.');
    } finally {
      setSlashing(false);
    }
  };

  const addBeneficiary = () => {
    if (beneficiaries.length >= 20) return;
    setBeneficiaries([...beneficiaries, { address: '', bps: '' }]);
  };

  const removeBeneficiary = (i: number) => {
    setBeneficiaries(beneficiaries.filter((_, idx) => idx !== i));
  };

  const updateBeneficiary = (i: number, field: 'address' | 'bps', value: string) => {
    const next = [...beneficiaries];
    next[i] = { ...next[i], [field]: value };
    setBeneficiaries(next);
  };

  const handleSaveRevenueSplit = async () => {
    setError(null);
    const totalBps = beneficiaries.reduce((sum, b) => sum + (Number(b.bps) || 0), 0);
    if (totalBps !== 10000) {
      setError(`Beneficiary BPS must sum to 10000 (currently ${totalBps})`);
      return;
    }
    try {
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      setError('Failed to save revenue split.');
    }
  };

  const handleUpdateRoot = async () => {
    setError(null);
    try {
      const updates = registries.filter((r) => r.root.trim());
      if (updates.length === 0) {
        setError('Enter at least one merkle root.');
        return;
      }
      for (const r of updates) {
        await publishRegistryRoot(r.code, {
          root: r.root.trim(),
          blockHeight: Number(rootBlockHeight),
        });
      }
      setRegistries((prev) => prev.map((r) => ({ ...r, root: '' })));
      setRootBlockHeight('');
    } catch (err) {
      setError(`Failed to update registry root: ${(err as Error).message}`);
    }
  };

  if (!wallet?.isConnected) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your wallet to access the admin panel.
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

  return (
    <div className="container-page py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Contract configuration, verifier management, and protocol settings.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md px-4 py-3">{error}</div>
      )}

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">
            <Gauge className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="verifiers">
            <Shield className="h-4 w-4 mr-2" />
            Verifiers
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <Users className="h-4 w-4 mr-2" />
            Revenue Split
          </TabsTrigger>
          <TabsTrigger value="oracle">
            <Link className="h-4 w-4 mr-2" />
            Oracle Roots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Protocol Fee (BPS)</label>
                  <Input
                    type="number"
                    value={feeBps}
                    onChange={(e) => setFeeBps(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 – 1000 BPS (0–10%)</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Verifier Threshold</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Approvals required to mint</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Verifier Quorum</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={quorum}
                    onChange={(e) => setQuorum(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimum verifiers to keep stake</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Approval Window (seconds)</label>
                  <Input
                    type="number"
                    min={3600}
                    value={approvalWindow}
                    onChange={(e) => setApprovalWindow(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">e.g. 2592000 = 30 days</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Buffer Pool (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={bufferPct}
                    onChange={(e) => setBufferPct(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Percentage held in buffer</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Admin: <span className="font-mono text-xs">{config?.admin ?? 'n/a'}</span>
              </div>
              <Button onClick={handleSaveConfig} disabled={configSaving}>
                {configSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    system?.network.connected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span>
                  Soroban RPC:{' '}
                  <strong>{system?.network.connected ? 'Connected' : 'Disconnected'}</strong>
                </span>
              </div>
              {system?.network.sequence ? (
                <p className="text-muted-foreground">
                  Latest ledger: <span className="font-mono">#{system.network.sequence}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Protocol Counts</CardTitle>
            </CardHeader>
            <CardContent>
              {system ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  {[
                    ['Users', system.counts.users],
                    ['Credits', system.counts.credits],
                    ['Verifiers', system.counts.verifiers],
                    ['Offers', system.counts.offers],
                    ['Retirements', system.counts.retirements],
                    ['Webhooks', system.counts.webhooks],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border bg-muted/30 p-4">
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">System status unavailable.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              {contracts && Object.keys(contracts).length > 0 ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(contracts).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-mono text-xs truncate">{value ?? 'not configured'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Contract addresses unavailable.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verifier Management</CardTitle>
            </CardHeader>
            <CardContent>
              {verifiers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2" />
                  <p>No verifiers registered.</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stake</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reputation</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiers.map((v) => (
                        <tr key={v.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">
                            {v.user?.stellarPub.slice(0, 12)}...
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={v.status === 'ACTIVE' ? 'default' : 'destructive'}
                            >
                              {v.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {v.stake.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">{v.reputation}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setSlashVerifier(v);
                                setShowSlashDialog(true);
                              }}
                            >
                              <Slash className="h-3 w-3 mr-1" />
                              Slash
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Split Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {beneficiaries.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      placeholder="Stellar address"
                      value={b.address}
                      onChange={(e) => updateBeneficiary(i, 'address', e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="BPS"
                      value={b.bps}
                      onChange={(e) => updateBeneficiary(i, 'bps', e.target.value)}
                      className="w-24"
                    />
                    {beneficiaries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => removeBeneficiary(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addBeneficiary} disabled={beneficiaries.length >= 20}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Beneficiary
                </Button>
                <div className="text-sm text-muted-foreground">
                  Total BPS: {beneficiaries.reduce((sum, b) => sum + (Number(b.bps) || 0), 0)} / 10000
                </div>
              </div>
              <Button onClick={handleSaveRevenueSplit}>Save Revenue Split</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oracle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Oracle Root Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Update Merkle roots for external registries to enable credit bridging.
              </p>
              {registries.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium">{r.name}</div>
                  <Input
                    placeholder="Merkle root (hex)"
                    value={r.root}
                    onChange={(e) => {
                      const next = [...registries];
                      next[i] = { ...next[i], root: e.target.value };
                      setRegistries(next);
                    }}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium">Block height</div>
                <Input
                  placeholder="24150000"
                  value={rootBlockHeight}
                  onChange={(e) => setRootBlockHeight(e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
              <Button onClick={handleUpdateRoot}>Update Roots</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showSlashDialog} onOpenChange={setShowSlashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slash Verifier</DialogTitle>
            <DialogDescription>
              Penalize a verifier by reducing their stake and reputation.
            </DialogDescription>
          </DialogHeader>
          {slashVerifier && (
            <div className="space-y-3 py-2 text-sm">
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p>
                  <span className="text-muted-foreground">Address:</span>{' '}
                  <span className="font-mono">{slashVerifier.user?.stellarPub.slice(0, 12)}...</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Current Stake:</span>{' '}
                  {slashVerifier.stake.toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">Reputation:</span> {slashVerifier.reputation}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Slash Amount</label>
                <Input
                  type="number"
                  min={1}
                  max={slashVerifier.stake}
                  value={slashAmount}
                  onChange={(e) => setSlashAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlashDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSlash} disabled={slashing || !slashAmount}>
              {slashing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Execute Slash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
