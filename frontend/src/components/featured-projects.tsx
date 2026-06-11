'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/loading-skeleton';
import { getCredits } from '@/lib/api';
import type { Credit } from '@/types';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';

export function FeaturedProjects() {
  const [projects, setProjects] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCredits({ status: 'ACTIVE', limit: '6', sort: 'created_desc' })
      .then((res) => setProjects(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-6">Featured Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Featured Projects</h2>
        <Link href="/credits">
          <Button variant="ghost" size="sm">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((credit) => (
          <Link key={credit.id} href={`/credits/${credit.creditId}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge>{credit.status}</Badge>
                  <Badge variant="outline">{credit.methodology}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{credit.projectId}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {credit.geography}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(credit.vintageStart).getFullYear()} - {new Date(credit.vintageEnd).getFullYear()}
                  </div>
                  <p className="text-2xl font-bold text-primary pt-2">
                    {credit.tonnes.toLocaleString()} <span className="text-sm font-normal">tCO₂e</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
