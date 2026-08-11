import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Pagination and filtering options for the bridge records ledger.
 */
export class BridgeFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by source registry',
    example: 'VERRA',
  })
  @IsOptional()
  @IsString()
  registry?: string;

  @ApiPropertyOptional({
    description: 'Filter by bridge direction',
    enum: ['INBOUND', 'OUTBOUND'],
  })
  @IsOptional()
  @IsIn(['INBOUND', 'OUTBOUND'])
  status?: 'INBOUND' | 'OUTBOUND';

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
