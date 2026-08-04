import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateConfigDto {
  @IsInt()
  @Min(1)
  @Max(20)
  verifierThreshold!: number;

  @IsInt()
  @Min(1)
  @Max(20)
  verifierQuorum!: number;

  @IsInt()
  @Min(3600)
  @Max(90 * 24 * 3600)
  approvalWindow!: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  protocolFeeBps!: number;

  @IsInt()
  @Min(0)
  @Max(50)
  bufferPoolPct!: number;
}

export class VerifierAddressDto {
  @IsString()
  address!: string;
}

export class NetworkSwitchDto {
  @IsIn(['testnet', 'mainnet'])
  network!: 'testnet' | 'mainnet';

  @IsOptional()
  @IsString()
  rpcUrl?: string;
}
