import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * One beneficiary of a project's revenue split, with its share in basis
 * points. The sum of all bps shares must equal exactly 10000.
 */
export class BeneficiaryDto {
  @ApiProperty({
    description: 'Beneficiary Stellar address',
    example: 'GCK5F7W5MEC5LGQ2P5JZU4I3ZGQY6U7O7YVZ6NQ4VQ6C5M4J5K5D2',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Share in basis points (10000 = 100.00%)',
    example: 6000,
  })
  @IsInt()
  @Min(0)
  @Max(10000)
  bps: number;
}

/**
 * Admin request to configure revenue-split beneficiaries for a project.
 */
export class ConfigureRevenueSplitDto {
  @ApiProperty({
    description: 'Revenue-split beneficiaries (sum of bps must be 10000)',
    type: [BeneficiaryDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BeneficiaryDto)
  beneficiaries: BeneficiaryDto[];
}

/**
 * Request to distribute a payment among a project's configured beneficiaries.
 */
export class DistributeRevenueSplitDto {
  @ApiProperty({
    description: 'Stellar address of the payment asset (e.g. USDC)',
    example: 'CCCOWELVWODM25BX5H3NFRCOH27BRGQYNU3ZHTA5UKTV3E4V6S4K',
  })
  @IsString()
  asset: string;

  @ApiProperty({
    description: 'Amount to distribute (in the asset smallest unit)',
    example: 1000000000,
  })
  @IsInt()
  @Min(1)
  amount: number;
}
