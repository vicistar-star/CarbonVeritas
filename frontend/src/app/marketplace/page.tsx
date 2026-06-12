'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getMarketplaceStats, getOwnedCredits, createOffer } from '@/lib/api';
import { MarketplaceOrderbook } from '@/components/marketplace-orderbook';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { TrendingUp, BarChart3, PieChart, Loader2, TrendingDown, Plus } from 'lucide-react';
import type { MarketplaceStats, Credit } from '@/types';

export default function MarketplacePage() {
  const { wallet } = useWallet();
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [ownedCredits, setOwnedCredits] = useState<Credit[]>([]);
  const [selectedCreditId, setSelectedCreditId] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDC');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarketplaceStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const handleOpenCreateOffer = async () => {
    if (!wallet?.isConnected) return;
    setShowCreateOffer(true);
    try {
      const credits = await getOwnedCredits();
      setOwnedCredits(credits.filter((c) => c.status === 'ACTIVE'));
    } catch {
      setOwnedCredits([]);
    }
  };

  const handleCreateOffer = async () => {
    if (!selectedCreditId || !price || !amount) return;
    setCreating(true);
    setError(null);
    try {
      await createOffer({
        creditId: Number(selectedCreditId),
        pricePerTonne: Number(price),
        amount: Number(amount),
        currency,
      });
      setShowCreateOffer(false);
      setSelectedCreditId('');
      setPrice('');
      setAmount('');
    } catch {
      setError('Failed to create offer. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const statCards = [
    {
      title: 'Total Volume',
      value: stats ? `${stats.totalVolume.toLocaleString()} USDC` : '-',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      title: 'VWAP',
      value: stats ? `${stats.vwap.toFixed(2)} USDC` : '-',
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      title: 'Open Interest',
      value: stats ? `${stats.openInterest.toLocaleString()} tCO₂` : '-',
      icon: PieChart,
      color: 'text-purple-500',
    },
    {
      title: 'Active Listings',
      value: stats ? String(stats.totalListings) : '-',
      icon: TrendingDown,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="container-page py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Trade carbon credits on the open market.
          </p>
        </div>
        <Button onClick={handleOpenCreateOffer} disabled={!wallet?.isConnected}>
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-6 w-24 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{stat.title}</span>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order Book</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketplaceOrderbook />
        </CardContent>
      </Card>

      <Dialog open={showCreateOffer} onOpenChange={setShowCreateOffer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sell Offer</DialogTitle>
            <DialogDescription>
              List your carbon credits for sale on the marketplace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">{error}</div>
            )}
            <div>
              <label className="text-sm font-medium">Credit</label>
              <Select value={selectedCreditId} onValueChange={setSelectedCreditId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a credit" />
                </SelectTrigger>
                <SelectContent>
                  {ownedCredits.length === 0 ? (
                    <SelectItem value="" disabled>No active credits available</SelectItem>
                  ) : (
                    ownedCredits.map((c) => (
                      <SelectItem key={c.id} value={String(c.creditId)}>
                        #{c.creditId} — {c.methodology} ({c.geography}, {c.tonnes}t)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price per tonne</label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount (tonnes)</label>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                  placeholder="1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="XLM">XLM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOffer(false)}>Cancel</Button>
            <Button onClick={handleCreateOffer} disabled={creating || !selectedCreditId || !price || !amount}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
