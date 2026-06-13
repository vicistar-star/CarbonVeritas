'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getOwnedCredits, retireCredit, getCertificate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CertificatePreview } from '@/components/certificate-preview';
import { Flame, Loader2, AlertCircle, CheckCircle, ExternalLink, FileText, Download } from 'lucide-react';
import type { Credit } from '@/types';

export default function RetirePage() {
  const { wallet } = useWallet();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [beneficiary, setBeneficiary] = useState('');
  const [reason, setReason] = useState('');
  const [accountingPeriod, setAccountingPeriod] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retired, setRetired] = useState<{
    creditId: number;
    certificateHash?: string;
  } | null>(null);
  const [retiredCertificate, setRetiredCertificate] = useState<import('@/types').Certificate | null>(null);

  useEffect(() => {
    if (retired) {
      getCertificate(retired.creditId)
        .then((data) => setRetiredCertificate(data as unknown as import('@/types').Certificate))
        .catch(() => setRetiredCertificate(null));
    } else {
      setRetiredCertificate(null);
    }
  }, [retired]);

  useEffect(() => {
    if (wallet?.isConnected) {
      getOwnedCredits()
        .then((data) => setCredits(data.filter((c) => c.status === 'ACTIVE')))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [wallet]);

  const toggleCredit = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRetire = async () => {
    if (selectedIds.size === 0 || !beneficiary) return;
    setRetiring(true);
    setError(null);
    try {
      for (const creditId of Array.from(selectedIds)) {
        const result = await retireCredit(creditId, {
          beneficiary,
          reason,
          accountingPeriod: accountingPeriod || new Date().toISOString().slice(0, 7),
        });
        setRetired({
          creditId,
          certificateHash: result.certificateHash,
        });
      }
      setShowConfirm(false);
      setSelectedIds(new Set());
    } catch {
      setError('Retirement failed. Please try again.');
    } finally {
      setRetiring(false);
    }
  };

  const openConfirm = () => {
    if (selectedIds.size === 0 || !beneficiary) return;
    setShowConfirm(true);
  };

  const selectedCredits = credits.filter((c) => selectedIds.has(c.creditId));
  const totalTonnes = selectedCredits.reduce((sum, c) => sum + c.tonnes, 0);

  if (!wallet?.isConnected) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Retire Credits</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your wallet to retire carbon credits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Retire Credits</h1>
        <p className="text-muted-foreground mt-1">
          Permanently retire carbon credits on the Stellar blockchain.
        </p>
      </div>

      {retired ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Successfully Retired</h2>
              <p className="text-muted-foreground mb-4">
                Credit #{retired.creditId} has been permanently retired on the Stellar blockchain.
              </p>
              {retired.certificateHash && (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md mb-4">
                  <FileText className="h-4 w-4" />
                  Certificate Hash: {retired.certificateHash.slice(0, 16)}...
                </div>
              )}
              <div className="flex justify-center gap-3">
                <Button onClick={() => setRetired(null)}>Retire More</Button>
                <Button variant="outline" asChild>
                  <a href="/portfolio">
                    <ExternalLink className="h-4 w-4 mr-2" /> View Portfolio
                  </a>
                </Button>
                {retiredCertificate?.pdfUrl && (
                  <Button variant="secondary" asChild>
                    <a href={retiredCertificate.pdfUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4 mr-2" /> Download Certificate
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          {retiredCertificate && (
            <Card>
              <CardHeader>
                <CardTitle>Certificate Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <CertificatePreview certificate={retiredCertificate} />
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Credits</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : credits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No active credits available to retire.</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-10 px-4 py-3"></th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Methodology</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Geography</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vintage</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tonnes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credits.map((credit) => (
                        <tr
                          key={credit.id}
                          className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${
                            selectedIds.has(credit.creditId) ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => toggleCredit(credit.creditId)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(credit.creditId)}
                              onChange={() => toggleCredit(credit.creditId)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono">#{credit.creditId}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{credit.methodology}</Badge>
                          </td>
                          <td className="px-4 py-3">{credit.geography}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {credit.vintageStart} – {credit.vintageEnd}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{credit.tonnes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retirement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Beneficiary *</label>
                <Input
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="mt-1"
                  placeholder="Name of the beneficiary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Scope 1 offset, voluntary carbon offset"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Accounting Period</label>
                <Input
                  type="month"
                  value={accountingPeriod}
                  onChange={(e) => setAccountingPeriod(e.target.value)}
                  className="mt-1"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">{error}</div>
              )}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  {selectedIds.size} credit{selectedIds.size !== 1 ? 's' : ''} selected ({totalTonnes} tCO₂)
                </div>
                <Button
                  onClick={openConfirm}
                  disabled={selectedIds.size === 0 || !beneficiary}
                >
                  <Flame className="h-4 w-4 mr-2" />
                  Retire {selectedIds.size > 1 ? `(${selectedIds.size} credits)` : ''}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Retirement</DialogTitle>
                <DialogDescription>
                  This action is permanent and irreversible. Once retired, credits cannot be transferred or traded.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Irreversible Action
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Retired credits are permanently removed from circulation and cannot be reinstated.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Credits</span>
                    <p className="font-medium">{selectedCredits.map((c) => `#${c.creditId}`).join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total tonnes</span>
                    <p className="font-medium">{totalTonnes} tCO₂</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Beneficiary</span>
                    <p className="font-medium">{beneficiary}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reason</span>
                    <p className="font-medium">{reason || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRetire} disabled={retiring}>
                  {retiring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Permanently Retire
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
