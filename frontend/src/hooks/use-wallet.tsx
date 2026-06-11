'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as freighter from '@/lib/freighter';
import { setAuthToken } from '@/lib/api';
import type { WalletInfo } from '@/lib/freighter';

interface WalletContextType {
  wallet: WalletInfo | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  wallet: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const installed = await freighter.isFreighterInstalled();
      if (installed) {
        const pk = await freighter.getPublicKey();
        if (pk) {
          setWallet({ publicKey: pk, isConnected: true });
        }
      }
    } catch {
      // Freighter not available
    }
  }

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const info = await freighter.connectWallet();
      setWallet(info);
      // In production, you'd get a real JWT from the API via SEP-10
      setAuthToken('demo-token');
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await freighter.disconnectWallet();
    setWallet(null);
    setAuthToken(null);
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, isConnecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
