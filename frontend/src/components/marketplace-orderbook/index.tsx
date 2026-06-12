'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getListings, createOffer, buyCredits, cancelOffer } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, RefreshCw, Wallet, Clock, AlertCircle } from 'lucide-react';
import type { Offer } from '@/types';

const POLL_INTERVAL = 30000;

export function MarketplaceOrderbook() {
  const { wallet } = useWallet();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methodologyFilter, setMethodologyFilter] = useState('');
  const [geographyFilter, setGeographyFilter] = useState('');
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const filters: Record<string, string> = {};
      if (methodologyFilter) filters.methodology = methodologyFilter;
      if (geographyFilter) filters.geography = geographyFilter;
      const res = await getListings(filters);
      setOffers(res.data);
      setError(null);
    } catch {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [methodologyFilter, geographyFilter]);

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchListings]);

  const handleBuy = async () => {
    if (!selectedOffer) return;
    setPurchasing(true);
    try {
      await buyCredits(selectedOffer.offerId, buyAmount ? Number(buyAmount) : undefined);
      setShowBuyDialog(false);
      setBuyAmount('');
      fetchListings();
    } catch {
      setError('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCancel = async (offerId: number) => {
    setCancellingId(offerId);
    try {
      await cancelOffer(offerId);
      fetchListings();
    } catch {
      setError('Failed to cancel offer.');
    } finally {
      setCancellingId(null);
    }
  };

  const openBuyDialog = (offer: Offer) => {
    setSelectedOffer(offer);
    setBuyAmount(String(offer.amount - offer.amountFilled));
    setShowBuyDialog(true);
  };

  const remaining = (offer: Offer) => offer.amount - offer.amountFilled;
  const isOwnOffer = (offer: Offer) =>
    wallet?.isConnected && offer.seller?.stellarPub === wallet.publicKey;

  const methodologies = Array.from(new Set(offers.map((o) => o.credit?.methodology).filter(Boolean)));
  const geographies = Array.from(new Set(offers.map((o) => o.credit?.geography).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchListings}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={methodologyFilter} onValueChange={setMethodologyFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Methodology" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methodologies</SelectItem>
              {methodologies.map((m) => (
                <SelectItem key={m || ''} value={m || ''}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={geographyFilter} onValueChange={setGeographyFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Geography" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {geographies.map((g) => (
                <SelectItem key={g || ''} value={g || ''}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Polling every 30s
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchListings}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-2" />
            <p>No active listings found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Filled</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Methodology</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Geography</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expiry</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const rem = remaining(offer);
                const expired = offer.expiresAt && new Date(offer.expiresAt) < new Date();
                return (
                  <tr key={offer.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono">{offer.pricePerTonne} {offer.currency}</td>
                    <td className="px-4 py-3">{offer.amount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(offer.amountFilled / offer.amount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {offer.amountFilled}/{offer.amount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{offer.credit?.methodology || 'N/A'}</Badge>
                    </td>
                    <td className="px-4 py-3">{offer.credit?.geography || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {offer.expiresAt
                        ? new Date(offer.expiresAt).toLocaleDateString()
                        : 'No expiry'}
                      {expired && <Badge variant="destructive" className="ml-2 text-[10px]">Expired</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isOwnOffer(offer) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(offer.offerId)}
                          disabled={cancellingId === offer.offerId}
                        >
                          {cancellingId === offer.offerId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Cancel'
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openBuyDialog(offer)}
                          disabled={!wallet?.isConnected || expired || rem <= 0}
                        >
                          {!wallet?.isConnected ? 'Connect' : rem <= 0 ? 'Filled' : 'Buy'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Credits</DialogTitle>
            <DialogDescription>
              Purchase carbon credits from this listing.
            </DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Price per tonne</span>
                  <p className="font-mono font-medium">{selectedOffer.pricePerTonne} {selectedOffer.currency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Available</span>
                  <p className="font-medium">{remaining(selectedOffer)} tonnes</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Methodology</span>
                  <p>{selectedOffer.credit?.methodology || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Geography</span>
                  <p>{selectedOffer.credit?.geography || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Amount to buy (tonnes)</label>
                <Input
                  type="number"
                  min={1}
                  max={remaining(selectedOffer)}
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              {buyAmount && (
                <div className="text-sm border-t pt-2">
                  <span className="text-muted-foreground">Total cost: </span>
                  <span className="font-mono font-semibold">
                    {Number(buyAmount) * selectedOffer.pricePerTonne} {selectedOffer.currency}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyDialog(false)}>Cancel</Button>
            <Button onClick={handleBuy} disabled={purchasing || !buyAmount || Number(buyAmount) <= 0}>
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
