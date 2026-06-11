'use client';

import { useWallet } from '@/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletConnector() {
  const { wallet, isConnecting, connect, disconnect } = useWallet();

  if (isConnecting) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (wallet?.isConnected) {
    return (
      <div className="flex items-center gap-3">
        <Card className="px-3 py-1.5 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-mono">
            {wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-4)}
          </span>
        </Card>
        <Button variant="ghost" size="sm" onClick={disconnect}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={connect}>
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
