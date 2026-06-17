'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/loading-skeleton';
import { getCredits } from '@/lib/api';
import type { Credit } from '@/types';
import { Search, MapPin, Calendar, Filter } from 'lucide-react';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  ACTIVE: 'default',
  RETIRED: 'secondary',
  REJECTED: 'destructive',
};

export default function CreditsPage() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 12;

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { ...filters, limit: String(limit), page: String(page) };
      if (searchTerm) params.methodology = searchTerm;
      const res = await getCredits(params);
      setCredits(res.data);
      setTotal(res.meta.total);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [filters, page, searchTerm]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-page py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Carbon Credits</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search methodology..."
              className="pl-9 w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) => {
              const next = { ...filters };
              if (v === 'all') {
                delete next.status;
              } else {
                next.status = v;
              }
              setFilters(next);
            }}
          >
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="RETIRED">Retired</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : credits.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No credits found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credits.map((credit) => (
              <Link key={credit.id} href={`/credits/${credit.creditId}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant={statusColors[credit.status] ?? 'outline'}>
                        {credit.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        #{credit.creditId}
                      </span>
                    </div>
                    <CardTitle className="text-lg mt-2">{credit.projectId}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{credit.methodology}</p>
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

          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
