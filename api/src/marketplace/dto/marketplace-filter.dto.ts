import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MarketplaceFilterDto {
  @ApiPropertyOptional({ description: 'Filter by methodology', example: 'VCS' })
  @IsOptional()
  @IsString()
  methodology?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code', example: 'BR' })
  @IsOptional()
  @IsString()
  geography?: string;

  @ApiPropertyOptional({ description: 'Maximum price per tonne', example: 50 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Offer status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
