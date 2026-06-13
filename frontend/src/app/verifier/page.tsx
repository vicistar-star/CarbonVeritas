'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getCredits, getVerifiers, approveCredit, rejectCredit } from '@/lib/api';
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
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  Heart,
  AlertCircle,
  Clock,
  User,
  Star,
  ChevronDown,
  ChevronRight,

} from 'lucide-react';
import type { Credit, Verifier } from '@/types';

export default function VerifierPage() {
  const { wallet } = useWallet();
  const [pendingCredits, setPendingCredits] = useState<Credit[]>([]);
  const [verifiers, setVerifiers] = useState<Verifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heartbeatLoading, setHeartbeatLoading] = useState(false);
  const [expandedCredit, setExpandedCredit] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [creditsRes, verifiersData] = await Promise.all([
        getCredits({ status: 'PENDING', limit: '50' }),
        getVerifiers(),
      ]);
      setPendingCredits(creditsRes.data);
      setVerifiers(verifiersData);
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirm = async () => {
    if (!showConfirm) return;
    setActionLoading(true);
    setError(null);
    try {
      if (showConfirm.action === 'approve') {
        await approveCredit(showConfirm.id, comments);
      } else {
        await rejectCredit(showConfirm.id, reason);
      }
      setSelectedCredit(null);
      setComments('');
      setReason('');
      fetchData();
    } catch {
      setError(`Failed to ${showConfirm.action} credit. Please try again.`);
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  const handleHeartbeat = async () => {
    setHeartbeatLoading(true);
    try {
      await fetch('/api/verifiers/heartbeat', { method: 'POST' });
    } catch {
      // Silently handle
    } finally {
      setHeartbeatLoading(false);
    }
  };

  const isVerifier = wallet?.isConnected && verifiers.some(
    (v) => v.user?.stellarPub === wallet.publicKey && v.status === 'ACTIVE',
  );

  if (!wallet?.isConnected) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Verifier Dashboard</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your wallet to access the verifier dashboard.
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

  const expired = (credit: Credit) =>
    Date.now() - new Date(credit.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="container-page py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verifier Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Review and verify carbon credit submissions.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleHeartbeat}
          disabled={heartbeatLoading}
        >
          {heartbeatLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Heart className="h-4 w-4 mr-2" />
          )}
          Heartbeat
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md px-4 py-3">{error}</div>
      )}

      {!isVerifier && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You are not registered as an active verifier. Some actions may be unavailable.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals ({pendingCredits.length})
          </TabsTrigger>
          <TabsTrigger value="verifiers">
            Verifiers ({verifiers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingCredits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No pending credits awaiting review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-8 px-2 py-3"></th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Methodology</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Geography</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tonnes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCredits.map((credit) => {
                    const isExpanded = expandedCredit === credit.id;
                    return (
                      <tr key={credit.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setExpandedCredit(isExpanded ? null : credit.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        </td>
                        <td className="px-4 py-3 font-mono">#{credit.creditId}</td>
                        <td className="px-4 py-3 font-medium">{credit.projectId}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{credit.methodology}</Badge>
                        </td>
                        <td className="px-4 py-3">{credit.geography}</td>
                        <td className="px-4 py-3 text-right font-mono">{credit.tonnes}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(credit.createdAt).toLocaleDateString()}
                          </div>
                          {expired(credit) && (
                            <Badge variant="destructive" className="text-[10px] mt-1">Expired</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setSelectedCredit(credit);
                                setShowConfirm({ id: credit.creditId, action: 'approve' });
                              }}
                              disabled={!isVerifier}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8"
                              onClick={() => {
                                setSelectedCredit(credit);
                                setShowConfirm({ id: credit.creditId, action: 'reject' });
                              }}
                              disabled={!isVerifier}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {expandedCredit && (() => {
                const credit = pendingCredits.find((c) => c.id === expandedCredit);
                if (!credit) return null;
                return (
                  <div className="border-t bg-muted/20 px-6 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Serial Prefix</span>
                        <p className="font-mono text-xs mt-0.5">{credit.serialPrefix}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Vintage Range</span>
                        <p className="mt-0.5">{credit.vintageStart} – {credit.vintageEnd}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">SDG Flags</span>
                        <p className="mt-0.5">{credit.sdgFlags}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Permanence</span>
                        <p className="mt-0.5">{credit.permanenceRating}/10</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Buffer Contribution</span>
                        <p className="mt-0.5">{credit.bufferContributionPct}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Additionality Type</span>
                        <p className="mt-0.5">{credit.additionalityType}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Issuer</span>
                        <p className="font-mono text-xs mt-0.5">{credit.issuer?.stellarPub?.slice(0, 8)}...</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">IPFS</span>
                        <p className="font-mono text-xs mt-0.5 truncate max-w-[140px]">{credit.ipfsHash?.slice(0, 16)}...</p>
                      </div>
                    </div>
                    {credit.approvals && credit.approvals.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground font-medium">Existing Approvals</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {credit.approvals.map((a) => (
                            <Badge key={a.id} variant={a.approved ? 'default' : 'destructive'} className="text-[10px]">
                              {a.verifier.stellarPub.slice(0, 6)}... {a.approved ? '✓' : '✗'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verifiers" className="space-y-4">
          {verifiers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2" />
                <p>No verifiers registered yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verifiers.map((v) => (
                <Card key={v.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-5 w-5 ${v.status === 'ACTIVE' ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className="font-mono text-sm">
                          {v.user?.stellarPub.slice(0, 8)}...
                        </span>
                      </div>
                      <Badge
                        variant={v.status === 'ACTIVE' ? 'default' : v.status === 'PENDING' ? 'outline' : 'destructive'}
                      >
                        {v.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stake</span>
                        <p className="font-mono font-medium">{v.stake.toLocaleString()} XLM</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Star className="h-3 w-3" />
                          <span>Reputation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min((v.reputation / 100) * 100, 100)}%`,
                                backgroundColor:
                                  v.reputation >= 80
                                    ? 'hsl(142, 76%, 36%)'
                                    : v.reputation >= 50
                                      ? 'hsl(38, 92%, 50%)'
                                      : 'hsl(0, 84%, 60%)',
                              }}
                            />
                          </div>
                          <span className="font-medium text-xs w-6 text-right">{v.reputation}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{v.reputation} approvals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className={`h-3 w-3 ${v.heartbeatAt ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span>
                          {v.heartbeatAt
                            ? `${Math.floor((Date.now() - new Date(v.heartbeatAt).getTime()) / 3600000)}h ago`
                            : 'No heartbeat'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!showConfirm && showConfirm.action === 'approve'}
        onOpenChange={(open) => !open && setShowConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Credit #{selectedCredit?.creditId}</DialogTitle>
            <DialogDescription>
              Verify that this credit meets all requirements.
            </DialogDescription>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-3 py-2 text-sm">
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p><span className="text-muted-foreground">Project:</span> {selectedCredit.projectId}</p>
                <p><span className="text-muted-foreground">Methodology:</span> {selectedCredit.methodology}</p>
                <p><span className="text-muted-foreground">Geography:</span> {selectedCredit.geography}</p>
                <p><span className="text-muted-foreground">Tonnes:</span> {selectedCredit.tonnes}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Comments (optional)</label>
                <Input
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1"
                  placeholder="Add verification notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!showConfirm && showConfirm.action === 'reject'}
        onOpenChange={(open) => !open && setShowConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Credit #{selectedCredit?.creditId}</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this credit.
            </DialogDescription>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-3 py-2 text-sm">
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p><span className="text-muted-foreground">Project:</span> {selectedCredit.projectId}</p>
                <p><span className="text-muted-foreground">Methodology:</span> {selectedCredit.methodology}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1"
                  placeholder="Explain why this credit is being rejected..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={actionLoading || !reason}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
