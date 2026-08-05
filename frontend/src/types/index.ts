export interface Credit {
  id: string;
  creditId: number;
  projectId: string;
  methodology: string;
  vintageStart: string;
  vintageEnd: string;
  tonnes: number;
  geography: string;
  serialPrefix: string;
  sdgFlags: number;
  permanenceRating: number;
  bufferContributionPct: number;
  additionalityType: number;
  ipfsHash: string;
  status: CreditStatus;
  tokenId?: string;
  createdAt: string;
  issuer: { id: string; stellarPub: string };
  owner: { id: string; stellarPub: string };
  approvals?: Approval[];
  _count?: { approvals: number; offers: number };
}

export type CreditStatus = 'PENDING' | 'ACTIVE' | 'RETIRED' | 'REJECTED' | 'BRIDGED';

export interface Approval {
  id: string;
  creditId: string;
  verifierId: string;
  approved: boolean;
  comments?: string;
  createdAt: string;
  verifier: { id: string; stellarPub: string };
}

export interface Offer {
  id: string;
  offerId: number;
  creditId: string;
  sellerId: string;
  pricePerTonne: number;
  amount: number;
  amountFilled: number;
  currency: string;
  status: OfferStatus;
  expiresAt?: string;
  createdAt: string;
  seller: { id: string; stellarPub: string };
  credit: { creditId: number; projectId: string; methodology: string; geography: string; tonnes: number };
}

export type OfferStatus = 'ACTIVE' | 'FILLED' | 'CANCELLED' | 'EXPIRED';

export interface Trade {
  id: string;
  offerId: string;
  buyerId: string;
  amount: number;
  totalPrice: number;
  createdAt: string;
  buyer: { stellarPub: string };
  credit: { creditId: number; projectId: string; methodology: string };
}

export interface Retirement {
  id: string;
  creditId: string;
  retiredById: string;
  beneficiary: string;
  reason: string;
  accountingPeriod: string;
  tonnesRetired: number;
  txHash: string;
  ledgerSequence: number;
  timestamp: string;
  certificateHash?: string;
  credit?: { creditId: number; projectId: string; methodology: string; geography: string };
}

export interface Certificate {
  id: string;
  certificateHash?: string;
  txHash?: string;
  metadata: Record<string, unknown>;
  pdfUrl?: string;
  createdAt: string;
  owner?: string;
  retirement?: Retirement & { credit: { creditId: number; projectId: string; methodology: string; geography: string; vintageStart: string; vintageEnd: string; tonnes: number; serialPrefix: string } };
}

export interface Verifier {
  id: string;
  userId: string;
  status: VerifierStatus;
  stake: number;
  reputation: number;
  heartbeatAt?: string;
  createdAt: string;
  user: { stellarPub: string };
}

export type VerifierStatus = 'PENDING' | 'ACTIVE' | 'SLASHED' | 'UNREGISTERED';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MarketplaceStats {
  totalVolume: number;
  vwap: number;
  openInterest: number;
  totalListings: number;
}

export interface PricePoint {
  date: string;
  price: number;
  volume: number;
}

export interface ProtocolStats {
  totalCredits: number;
  totalTonnesRetired: number;
  activeVerifiers: number;
  totalOffers: number;
}

export interface DeepHealthCheck {
  name: string;
  status: 'up' | 'down' | 'not_configured';
  latencyMs?: number;
  detail?: string;
}

export interface DeepHealth {
  status: 'ok' | 'degraded';
  checks: DeepHealthCheck[];
  timestamp: string;
}

export interface AuthChallenge {
  challengeId: string;
  transaction: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export interface Webhook {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  success: boolean;
  attempts: number;
  statusCode: number | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
}

export interface ProtocolConfig {
  admin: string;
  verifierThreshold: number;
  verifierQuorum: number;
  approvalWindow: number;
  protocolFeeBps: number;
  bufferPoolPct: number;
}

export interface AdminContracts {
  [key: string]: string | null;
}

export interface SystemStatus {
  network: { connected: boolean; sequence?: number; ledgerHash?: string };
  counts: {
    users: number;
    credits: number;
    verifiers: number;
    offers: number;
    retirements: number;
    webhooks: number;
  };
}

export interface Scope3LineItem {
  retirementId: string;
  creditId: number;
  projectId: string;
  methodology: string;
  geography: string;
  vintageStart: string;
  vintageEnd: string;
  serialPrefix: string;
  tonnesRetired: number;
  beneficiary: string;
  reason: string;
  accountingPeriod: string;
  retirementDate: string;
  txHash: string;
  ledgerSequence: number;
  certificateHash: string | null;
}

export interface Scope3BreakdownEntry {
  tonnes: number;
  retirements: number;
  [dimension: string]: string | number;
}

export interface Scope3Summary {
  totalTonnesRetired: number;
  totalRetirements: number;
  totalCredits: number;
  byMethodology: Scope3BreakdownEntry[];
  byGeography: Scope3BreakdownEntry[];
  byVintage: Scope3BreakdownEntry[];
}

export interface Scope3Report {
  reportType: 'scope3';
  reportingPeriod: string;
  generatedAt: string;
  account: { wallet: string };
  summary: Scope3Summary;
  lineItems: Scope3LineItem[];
}
