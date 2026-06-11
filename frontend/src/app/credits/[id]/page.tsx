'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/loading-skeleton';
import { getCredit } from '@/lib/api';
import type { Credit } from '@/types';
import {
  MapPin, Calendar, Hash, User, FileText, Shield, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  ACTIVE: 'default',
  RETIRED: 'secondary',
  REJECTED: 'destructive',
};

export default function CreditDetailPage() {
  const params = useParams();
  const creditId = Number(params.id);
  const [credit, setCredit] = useState<Credit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCredit(creditId)
      .then(setCredit)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [creditId]);

  if (loading) return <PageSkeleton />;

  if (!credit) {
    return (
      <div className="container-page py-16 text-center">
        <h2 className="text-2xl font-bold">Credit Not Found</h2>
        <p className="text-muted-foreground mt-2">The credit you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/credits">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Credits
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <Link href="/credits">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Credits
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{credit.projectId}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Credit #{credit.creditId}
                  </p>
                </div>
                <Badge variant={statusColors[credit.status]} className="text-sm px-3 py-1">
                  {credit.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Geography:</span>
                    <span className="font-medium">{credit.geography}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Vintage:</span>
                    <span className="font-medium">
                      {new Date(credit.vintageStart).getFullYear()} - {new Date(credit.vintageEnd).getFullYear()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Methodology:</span>
                    <span className="font-medium">{credit.methodology}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-medium">{credit.serialPrefix}...</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Issuer:</span>
                    <span className="font-mono text-xs">
                      {credit.issuer.stellarPub.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Permanence:</span>
                    <span className="font-medium">{credit.permanenceRating}/100</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Buffer:</span>
                    <span className="font-medium">{credit.bufferContributionPct}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">IPFS:</span>
                    <span className="font-mono text-xs">
                      {credit.ipfsHash.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {credit.approvals && credit.approvals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approvals & Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {credit.approvals.map((approval) => (
                    <div key={approval.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium">
                          {approval.approved ? 'Approved' : 'Rejected'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {approval.verifier.stellarPub.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={approval.approved ? 'default' : 'destructive'}>
                          {approval.approved ? '✓' : '✗'}
                        </Badge>
                        {approval.comments && (
                          <p className="text-xs text-muted-foreground mt-1">{approval.comments}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-primary">
                  {credit.tonnes.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">tonnes CO₂e</p>
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusColors[credit.status]}>{credit.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-mono text-xs">
                    {credit.owner.stellarPub.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(credit.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
