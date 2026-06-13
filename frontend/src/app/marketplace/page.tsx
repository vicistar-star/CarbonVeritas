'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { getMarketplaceStats, getOwnedCredits, createOffer, getPriceHistory } from '@/lib/api';
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart, Loader2, TrendingDown, Plus, Calendar } from 'lucide-react';
import type { MarketplaceStats, Credit, PricePoint } from '@/types';

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
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [priceRange, setPriceRange] = useState<'30d' | '90d' | '1y'>('30d');
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    getMarketplaceStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setChartLoading(true);
    getPriceHistory(priceRange)
      .then((res) => setPriceHistory(res.data ?? []))
      .catch(() => setPriceHistory([]))
      .finally(() => setChartLoading(false));
  }, [priceRange]);

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
          <div className="flex items-center justify-between">
            <CardTitle>Price History</CardTitle>
            <div className="flex items-center gap-1">
              {(['30d', '90d', '1y'] as const).map((r) => (
                <Button
                  key={r}
                  variant={priceRange === r ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPriceRange(r)}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : priceHistory.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No price data available yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v.toFixed(1)}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                    formatter={(value) => [`${Number(value).toFixed(2)} USDC`, 'Price']}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(142, 76%, 36%)"
                    fill="url(#priceGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

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
