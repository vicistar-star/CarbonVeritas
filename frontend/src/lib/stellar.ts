export interface StellarNetworkConfig {
  network: 'testnet' | 'mainnet' | 'futurenet';
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
}

const NETWORKS: Record<string, StellarNetworkConfig> = {
  testnet: {
    network: 'testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  },
  mainnet: {
    network: 'mainnet',
    rpcUrl: 'https://soroban.stellar.org',
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  },
  futurenet: {
    network: 'futurenet',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    networkPassphrase: 'Future Network ; September 2024',
  },
};

function getNetwork(): StellarNetworkConfig {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
  return NETWORKS[network] ?? NETWORKS.testnet;
}

export const stellarConfig = {
  getNetwork,
};
