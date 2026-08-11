import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BridgeMetadataDto } from './bridge-metadata.dto';

/**
 * Request to import a credit from a legacy registry (Verra, Gold Standard,
 * CDM, ACR, CAR, Plan Vivo) via a Merkle inclusion proof against the
 * registry's published root.
 */
export class BridgeInDto {
  @ApiProperty({
    description: 'Source registry identifier',
    enum: ['VERRA', 'GOLD_STANDARD', 'CDM', 'ACR', 'CAR', 'PLAN_VIVO'],
    example: 'VERRA',
  })
  @IsString()
  @MinLength(2)
  sourceRegistry: string;

  @ApiProperty({
    description: 'Serial number on the source registry',
    example: 'VCS-1500-00034567-2023',
  })
  @IsString()
  @MinLength(1)
  sourceSerial: string;

  @ApiProperty({
    description: 'Merkle leaf hash (64-char hex) of the registry record',
    example: '3a2f'.padEnd(64, '0'),
  })
  @IsString()
  leaf: string;

  @ApiProperty({
    description: 'Merkle proof sibling hashes (64-char hex each)',
    example: ['4b1c'.padEnd(64, '0')],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  merkleProof: string[];

  @ApiProperty({
    description: 'Published registry merkle root the proof must verify against',
    example: '5c3d'.padEnd(64, '0'),
  })
  @IsString()
  merkleRoot: string;

  @ApiProperty({ description: 'On-chain credit metadata for the bridged credit' })
  @ValidateNested()
  @Type(() => BridgeMetadataDto)
  metadata: BridgeMetadataDto;
}
