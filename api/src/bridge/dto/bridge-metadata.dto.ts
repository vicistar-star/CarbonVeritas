import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Credit metadata for a bridged credit. Mirrors the on-chain
 * `CreditMetadata` struct fields so the API can build the exact
 * contract-call argument without any on-chain knowledge of the
 * source registry.
 */
export class BridgeMetadataDto {
  @ApiProperty({ description: 'Project identifier', example: 'VCS-1500-AMZ-001' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Methodology code', example: 'VCS:VM0007' })
  @IsString()
  methodology: string;

  @ApiProperty({ description: 'Vintage start (Unix seconds)', example: 1704067200 })
  @IsInt()
  @Min(0)
  vintageStart: number;

  @ApiProperty({ description: 'Vintage end (Unix seconds)', example: 1735689600 })
  @IsInt()
  @Min(0)
  vintageEnd: number;

  @ApiProperty({ description: 'Tonnes CO2e (in millitonnes)', example: 10000000 })
  @IsInt()
  @Min(1)
  tonnes: number;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code', example: 'BR' })
  @IsString()
  geography: string;

  @ApiProperty({ description: 'Source registry serial prefix', example: 'VCS-1500-' })
  @IsString()
  serialPrefix: string;

  @ApiPropertyOptional({ description: 'SDG co-benefit bitmask', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sdgFlags?: number;

  @ApiPropertyOptional({ description: 'Permanence rating 0-100', example: 85 })
  @IsOptional()
  @IsInt()
  @Min(0)
  permanenceRating?: number;

  @ApiPropertyOptional({ description: 'Buffer pool contribution percentage', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferContributionPct?: number;

  @ApiPropertyOptional({ description: 'Additionality determination type', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  additionalityType?: number;

  @ApiPropertyOptional({ description: 'IPFS CID of the MRV documentation bundle' })
  @IsOptional()
  @IsString()
  ipfsHash?: string;
}
