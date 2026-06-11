import { stellarConfig } from './stellar';

export interface WalletInfo {
  publicKey: string;
  isConnected: boolean;
}

async function getFreighterModule() {
  try {
    return await import('@stellar/freighter-api');
  } catch {
    throw new Error('Freighter extension not detected. Please install Freighter wallet.');
  }
}

export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const freighter = await getFreighterModule();
    const result = await freighter.isConnected();
    return !!(result && (result as { isConnected?: boolean }).isConnected);
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<WalletInfo> {
  const freighter = await getFreighterModule();
  const result = await freighter.requestAccess();
  return {
    publicKey: typeof result === 'string' ? result : '',
    isConnected: true,
  };
}

export async function disconnectWallet(): Promise<void> {
  // Freighter API does not expose disconnect
}

export async function getPublicKey(): Promise<string | null> {
  try {
    const freighter = await getFreighterModule();
    const result = await freighter.getAddress();
    if (typeof result === 'string') return result;
    if (result && typeof (result as { address?: string }).address === 'string') {
      return (result as { address: string }).address;
    }
    return null;
  } catch {
    return null;
  }
}

export async function signTransaction(
  xdr: string,
  opts?: { network?: string },
): Promise<string> {
  const freighter = await getFreighterModule();
  const network = opts?.network ?? stellarConfig.getNetwork().networkPassphrase;
  const result = await freighter.signTransaction(xdr, { networkPassphrase: network });
  return typeof result === 'string' ? result : (result as { signedTxXdr?: string }).signedTxXdr ?? '';
}

export async function getNetworkDetails(): Promise<{ network: string; networkPassphrase: string }> {
  const config = stellarConfig.getNetwork();
  return {
    network: config.network,
    networkPassphrase: config.networkPassphrase,
  };
}
