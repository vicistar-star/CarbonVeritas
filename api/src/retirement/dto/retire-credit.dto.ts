import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RetireCreditDto {
  @ApiProperty({ description: 'Reason for retirement', example: 'Offsetting 2024 corporate emissions' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Beneficiary name or identifier', example: 'NetZero Corp' })
  @IsString()
  @IsNotEmpty()
  beneficiary: string;

  @ApiProperty({ description: 'Accounting period', example: '2024-Q1' })
  @IsString()
  @IsNotEmpty()
  accountingPeriod: string;

  @ApiPropertyOptional({ description: 'Number of tonnes to retire (defaults to full credit)', example: 50 })
  @IsOptional()
  @IsString()
  tonnesRetired?: string;
}
