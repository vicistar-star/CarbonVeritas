import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ description: 'Credit ID to sell', example: 1 })
  @IsInt()
  @Min(1)
  creditId: number;

  @ApiProperty({ description: 'Price per tonne in given currency', example: 12.5 })
  @IsNumber()
  @Min(0.01)
  pricePerTonne: number;

  @ApiProperty({ description: 'Amount of tonnes to sell', example: 100 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USDC' })
  @IsString()
  @MinLength(2)
  currency: string;

  @ApiPropertyOptional({ description: 'Expiry timestamp (Unix ms)', example: 1893456000000 })
  @IsOptional()
  @IsInt()
  expiresAt?: number;
}
