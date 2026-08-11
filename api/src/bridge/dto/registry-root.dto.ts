import { IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Admin request to publish a new merkle root for a legacy registry. The
 * root is written on-chain by the MerkleBridge contract and is the value
 * every `bridge_in` proof is verified against.
 */
export class UpdateRegistryRootDto {
  @ApiProperty({
    description: 'New merkle root (64-char hex)',
    example: '5c3d'.padEnd(64, '0'),
  })
  @IsString()
  root: string;

  @ApiProperty({
    description: 'Source registry block height the root corresponds to',
    example: 24150000,
  })
  @IsInt()
  @Min(0)
  blockHeight: number;
}
