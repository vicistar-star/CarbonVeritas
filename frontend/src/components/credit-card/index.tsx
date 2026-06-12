'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Hash } from 'lucide-react';
import type { Credit } from '@/types';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  ACTIVE: 'default',
  RETIRED: 'secondary',
  REJECTED: 'destructive',
};

interface CreditCardProps {
  credit: Credit;
  href?: string;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

export function CreditCard({ credit, href, selectable, selected, onToggle }: CreditCardProps) {
  const inner = (
    <Card className={`h-full transition-shadow ${href ? 'hover:shadow-md cursor-pointer' : ''} ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          {selectable ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              className="h-4 w-4 rounded border-gray-300"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Badge variant={statusColors[credit.status] ?? 'outline'}>{credit.status}</Badge>
          )}
          <span className="text-xs text-muted-foreground">#{credit.creditId}</span>
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
            {new Date(credit.vintageStart).getFullYear()} – {new Date(credit.vintageEnd).getFullYear()}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-4 w-4" />
            <span className="font-mono text-xs">{credit.serialPrefix}...</span>
          </div>
          <p className="text-2xl font-bold text-primary pt-2">
            {credit.tonnes.toLocaleString()} <span className="text-sm font-normal">tCO₂e</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}
