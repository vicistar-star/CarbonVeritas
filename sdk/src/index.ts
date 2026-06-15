export { CarbonVeritasClient } from './client';
export { CreditsModule } from './credits';
export { MarketplaceModule } from './marketplace';
export { RetirementModule } from './retirement';
export { CertificatesModule } from './certificates';

export * from './types';

import { CarbonVeritasClient } from './client';
import { CreditsModule } from './credits';
import { MarketplaceModule } from './marketplace';
import { RetirementModule } from './retirement';
import { CertificatesModule } from './certificates';
import type { SdkConfig } from './types';

export class CarbonVeritasSDK {
  public client: CarbonVeritasClient;
  public credits: CreditsModule;
  public marketplace: MarketplaceModule;
  public retirement: RetirementModule;
  public certificates: CertificatesModule;

  constructor(config: SdkConfig = {}) {
    this.client = new CarbonVeritasClient(config);
    this.credits = new CreditsModule(this.client);
    this.marketplace = new MarketplaceModule(this.client);
    this.retirement = new RetirementModule(this.client);
    this.certificates = new CertificatesModule(this.client);
  }
}

export default CarbonVeritasSDK;
