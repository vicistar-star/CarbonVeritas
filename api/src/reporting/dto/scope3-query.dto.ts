import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class Scope3QueryDto {
  @ApiPropertyOptional({
    description: 'Response format',
    enum: ['json', 'csv'],
    default: 'json',
  })
  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv' = 'json';

  @ApiPropertyOptional({
    description: 'Restrict the report to retirements in this calendar year',
    example: 2026,
  })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2200)
  @Type(() => Number)
  year?: number;
}
