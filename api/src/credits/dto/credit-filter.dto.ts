import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreditFilterDto {
  @ApiPropertyOptional({ description: 'Filter by methodology code', example: 'VCS' })
  @IsOptional()
  @IsString()
  methodology?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code', example: 'BR' })
  @IsOptional()
  @IsString()
  geography?: string;

  @ApiPropertyOptional({ description: 'Minimum vintage year', example: 2020 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  vintageMin?: number;

  @ApiPropertyOptional({ description: 'Maximum vintage year', example: 2024 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  vintageMax?: number;

  @ApiPropertyOptional({ description: 'Credit status', example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Issuer Stellar public key' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ description: 'Owner Stellar public key' })
  @IsOptional()
  @IsString()
  owner?: string;

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

  @ApiPropertyOptional({ description: 'Sort order', example: 'created_desc' })
  @IsOptional()
  @IsString()
  sort?: string;
}
