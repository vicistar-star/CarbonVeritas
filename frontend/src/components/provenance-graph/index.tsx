'use client';

import { useState, useEffect } from 'react';
import { getProvenance } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Send, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';

interface ProvenanceEvent {
  type: string;
  timestamp: string;
  actor: string;
}

const eventConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  SUBMITTED: { icon: Send, color: 'text-blue-500', label: 'Issued' },
  APPROVED: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
  REJECTED: { icon: XCircle, color: 'text-red-500', label: 'Rejected' },
  MINTED: { icon: CheckCircle, color: 'text-emerald-500', label: 'Minted' },
  TRANSFERRED: { icon: ArrowRight, color: 'text-purple-500', label: 'Transferred' },
  RETIRED: { icon: RotateCcw, color: 'text-orange-500', label: 'Retired' },
};

export function ProvenanceGraph({ creditId }: { creditId: number }) {
  const [events, setEvents] = useState<ProvenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getProvenance(creditId);
        setEvents(Array.isArray(data) ? data : []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [creditId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5 mx-auto mb-1" />
          No provenance data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative pl-8 border-l-2 border-muted space-y-0">
      {events.map((event, i) => {
        const config = eventConfig[event.type] || {
          icon: AlertCircle,
          color: 'text-muted-foreground',
          label: event.type,
        };
        const Icon = config.icon;
        const isLast = i === events.length - 1;
        return (
          <div key={i} className="relative pb-6 last:pb-0">
            <div
              className={`absolute -left-[26px] p-1 rounded-full bg-background border-2 ${isLast ? 'border-primary' : 'border-muted'}`}
            >
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            </div>
            <div className="ml-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{config.label}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {new Date(event.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-mono">{event.actor.slice(0, 8)}...{event.actor.slice(-4)}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
