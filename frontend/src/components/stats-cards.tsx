'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCardSkeleton } from '@/components/loading-skeleton';
import { getProtocolStats } from '@/lib/api';
import type { ProtocolStats } from '@/types';
import { Trees, Flame, Users, BarChart3 } from 'lucide-react';

const defaultStats: ProtocolStats = {
  totalCredits: 0,
  totalTonnesRetired: 0,
  activeVerifiers: 0,
  totalOffers: 0,
};

export function StatsCards() {
  const [stats, setStats] = useState<ProtocolStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProtocolStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Total Credits',
      value: stats.totalCredits.toLocaleString(),
      icon: Trees,
      description: 'Credits issued on platform',
    },
    {
      label: 'Tonnes Retired',
      value: stats.totalTonnesRetired.toLocaleString(),
      icon: Flame,
      description: 'tCO₂e permanently retired',
    },
    {
      label: 'Active Verifiers',
      value: stats.activeVerifiers,
      icon: Users,
      description: 'Independent verifiers',
    },
    {
      label: 'Open Listings',
      value: stats.totalOffers,
      icon: BarChart3,
      description: 'Active marketplace offers',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
