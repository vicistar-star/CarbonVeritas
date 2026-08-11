import { CarbonVeritasClient } from './client';
import { CreditsModule } from './credits';
import { MarketplaceModule } from './marketplace';
import { RetirementModule } from './retirement';
import { CertificatesModule } from './certificates';
import { WebhooksModule } from './webhooks';
import { AdminModule } from './admin';
import { ReportingModule } from './reporting';
import { BridgeModule } from './bridge';
import { RevenueSplitModule } from './revenue-split';
import type { SdkConfig } from './types';

export class CarbonVeritasSDK {
  public client: CarbonVeritasClient;
  public credits: CreditsModule;
  public marketplace: MarketplaceModule;
  public retirement: RetirementModule;
  public certificates: CertificatesModule;
  public webhooks: WebhooksModule;
  public admin: AdminModule;
  public reporting: ReportingModule;
  public bridge: BridgeModule;
  public revenueSplit: RevenueSplitModule;

  constructor(config: SdkConfig = {}) {
    this.client = new CarbonVeritasClient(config);
    this.credits = new CreditsModule(this.client);
    this.marketplace = new MarketplaceModule(this.client);
    this.retirement = new RetirementModule(this.client);
    this.certificates = new CertificatesModule(this.client);
    this.webhooks = new WebhooksModule(this.client);
    this.admin = new AdminModule(this.client);
    this.reporting = new ReportingModule(this.client);
    this.bridge = new BridgeModule(this.client);
    this.revenueSplit = new RevenueSplitModule(this.client);
  }
}

export { CarbonVeritasClient } from './client';
export { CreditsModule } from './credits';
export { MarketplaceModule } from './marketplace';
export { RetirementModule } from './retirement';
export { CertificatesModule } from './certificates';
export { WebhooksModule } from './webhooks';
export { AdminModule } from './admin';
export { ReportingModule } from './reporting';
export { BridgeModule } from './bridge';
export { RevenueSplitModule } from './revenue-split';

export * from './types';

export default CarbonVeritasSDK;
