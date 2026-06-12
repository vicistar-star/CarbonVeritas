'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getOwnedCredits, getListings, getOwnedCertificates } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ProvenanceGraph } from '@/components/provenance-graph';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trophy, AlertCircle, FileText, ExternalLink, Search } from 'lucide-react';
import type { Credit, Offer, Certificate } from '@/types';

export default function PortfolioPage() {
  const { wallet } = useWallet();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!wallet?.isConnected) {
      setLoading(false);
      return;
    }
    Promise.all([
      getOwnedCredits().catch(() => []),
      getOwnedCertificates().catch(() => []),
      getListings().catch(() => [] as unknown as { data: Offer[] }),
    ])
      .then(([creditsData, certsData, offersData]) => {
        setCredits(creditsData);
        setCertificates(certsData);

        const offersList = Array.isArray(offersData)
          ? offersData
          : 'data' in offersData
            ? (offersData as { data: Offer[] }).data
            : [];
        setOffers(offersList.filter((o) => {
          const pubKey = wallet?.publicKey;
          return pubKey && o.seller?.stellarPub === pubKey;
        }));
      })
      .finally(() => setLoading(false));
  }, [wallet]);

  const filteredCredits = credits.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.methodology.toLowerCase().includes(q) ||
      c.geography.toLowerCase().includes(q) ||
      c.projectId.toLowerCase().includes(q) ||
      String(c.creditId).includes(q)
    );
  });

  if (!wallet?.isConnected) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your wallet to view your portfolio.
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
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground mt-1">
          Your carbon credits, offers, and certificates.
        </p>
      </div>

      <Tabs defaultValue="credits">
        <TabsList>
          <TabsTrigger value="credits">Credits ({credits.length})</TabsTrigger>
          <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
          <TabsTrigger value="certificates">Certificates ({certificates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="credits" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search credits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredCredits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{search ? 'No matching credits found.' : 'No credits in your portfolio yet.'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Methodology</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Geography</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vintage</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tonnes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredits.map((credit) => (
                    <tr key={credit.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono">#{credit.creditId}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{credit.methodology}</Badge>
                      </td>
                      <td className="px-4 py-3">{credit.geography}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {credit.vintageStart} – {credit.vintageEnd}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{credit.tonnes}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            credit.status === 'ACTIVE'
                              ? 'default'
                              : credit.status === 'RETIRED'
                                ? 'secondary'
                                : credit.status === 'PENDING'
                                  ? 'outline'
                                  : 'destructive'
                          }
                        >
                          {credit.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCredit(credit)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          {offers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No offers created yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credit</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Filled</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono">#{offer.offerId}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">#{offer.credit?.creditId}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {offer.pricePerTonne} {offer.currency}
                      </td>
                      <td className="px-4 py-3 text-right">{offer.amount}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {offer.amountFilled}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            offer.status === 'ACTIVE'
                              ? 'default'
                              : offer.status === 'FILLED'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {offer.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(offer.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          {certificates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No certificates yet. Retire a credit to generate a certificate.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <Card key={cert.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <Badge variant="outline" className="text-[10px]">
                        {new Date(cert.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    {cert.retirement && (
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Credit:</span>{' '}
                          #{cert.retirement.credit?.creditId}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Methodology:</span>{' '}
                          {cert.retirement.credit?.methodology}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Tonnes:</span>{' '}
                          {cert.retirement.tonnesRetired}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Beneficiary:</span>{' '}
                          {cert.retirement.beneficiary}
                        </p>
                      </div>
                    )}
                    {cert.certificateHash && (
                      <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                        {cert.certificateHash.slice(0, 24)}...
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {cert.pdfUrl && (
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <a href={cert.pdfUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> PDF
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={`/certificates/${cert.id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" /> Verify
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedCredit} onOpenChange={(open) => !open && setSelectedCredit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Provenance — Credit #{selectedCredit?.creditId}
            </DialogTitle>
          </DialogHeader>
          {selectedCredit && <ProvenanceGraph creditId={selectedCredit.creditId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
