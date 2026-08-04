'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhook,
  listWebhookDeliveries,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Webhook, WebhookDelivery } from '@/types';
import { Webhook as WebhookIcon, Loader2, Plus, Trash2, Send, AlertCircle } from 'lucide-react';

const EVENT_TYPES = [
  'credit.submitted',
  'credit.approved',
  'credit.minted',
  'credit.rejected',
  'credit.retired',
  'marketplace.offer.created',
  'marketplace.offer.cancelled',
  'marketplace.offer.filled',
  'verifier.registered',
];

export default function WebhooksPage() {
  const { wallet } = useWallet();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...EVENT_TYPES]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [hooks, dels] = await Promise.all([listWebhooks(), listWebhookDeliveries()]);
      setWebhooks(hooks);
      setDeliveries(dels);
    } catch {
      setError('Failed to load webhooks. Check that you are connected and authenticated.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet?.isConnected) {
      refresh();
    } else {
      setLoading(false);
    }
  }, [wallet?.isConnected]);

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  const handleCreate = async () => {
    if (!url.trim()) {
      setError('A callback URL is required.');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event to subscribe to.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createWebhook({ url: url.trim(), events: selectedEvents });
      setUrl('');
      setSelectedEvents([...EVENT_TYPES]);
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to register webhook.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setError('Failed to delete webhook.');
    }
  };

  const handleTest = async (id: string) => {
    setError(null);
    try {
      await testWebhook(id);
      await refresh();
    } catch {
      setError('Failed to send test delivery.');
    }
  };

  if (!wallet?.isConnected) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <WebhookIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Webhooks</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect your wallet to manage webhook endpoints that receive CarbonVeritas events.
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
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground mt-1">
          Receive real-time CarbonVeritas events at your endpoints, with automatic retries.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md px-4 py-3">
          <AlertCircle className="h-4 w-4 inline-block mr-1 -mt-0.5" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Register Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Callback URL</label>
            <Input
              type="url"
              placeholder="https://example.com/carbonveritas/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Events</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EVENT_TYPES.map((evt) => {
                const active = selectedEvents.includes(evt);
                return (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-mono ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary'
                    }`}
                  >
                    {evt}
                  </button>
                );
              })}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Register Webhook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <WebhookIcon className="h-8 w-8 mx-auto mb-2" />
              <p>No webhooks registered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((w) => (
                <div key={w.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={w.active ? 'default' : 'secondary'}>
                        {w.active ? 'Active' : 'Disabled'}
                      </Badge>
                      <span className="font-mono text-xs truncate">{w.url}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => handleTest(w.id)}>
                        <Send className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                      <Button variant="destructive" size="sm" className="h-8" onClick={() => handleDelete(w.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {w.events.map((evt) => (
                      <span
                        key={evt}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono text-muted-foreground"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Log</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No deliveries yet. Test an endpoint or wait for the next event.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Attempts</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Duration</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{d.eventType}</td>
                      <td className="px-4 py-3">
                        <Badge variant={d.success ? 'default' : 'destructive'}>{d.success ? 'SUCCESS' : 'FAILED'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{d.attempts}</td>
                      <td className="px-4 py-3 text-right font-mono">{d.statusCode ?? '-'}</td>
                      <td className="px-4 py-3 text-right">{d.durationMs}ms</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
