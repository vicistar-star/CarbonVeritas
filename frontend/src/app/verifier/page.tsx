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
                  {pendingCredits.map((credit) => (
                    <tr key={credit.id} className="border-b hover:bg-muted/30 transition-colors">
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
                  ))}
                </tbody>
              </table>
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
                        <p className="font-mono font-medium">{v.stake.toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>Reputation</span>
                        </div>
                        <p className="font-medium">{v.reputation}</p>
                      </div>
                    </div>
                    {v.heartbeatAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last heartbeat: {new Date(v.heartbeatAt).toLocaleDateString()}
                      </p>
                    )}
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
