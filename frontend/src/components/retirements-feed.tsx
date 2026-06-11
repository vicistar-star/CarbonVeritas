'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCredits } from '@/lib/api';
import type { Credit } from '@/types';
import { Flame, Clock } from 'lucide-react';

export function RetirementsFeed() {
  const [retirements, setRetirements] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCredits({ status: 'RETIRED', limit: '5', sort: 'created_desc' })
      .then((res) => setRetirements(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Recent Retirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Recent Retirements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {retirements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No retirements yet
          </p>
        ) : (
          <div className="space-y-4">
            {retirements.map((credit) => (
              <div key={credit.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{credit.projectId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {credit.geography}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(credit.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-orange-600">
                    {credit.tonnes} tCO₂e
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
