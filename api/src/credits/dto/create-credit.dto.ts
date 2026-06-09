import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreditDto {
  @ApiProperty({ description: 'Project identifier', example: 'AMZ-REF-001' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Methodology code', example: 'VCS:VM0007' })
  @IsString()
  @IsNotEmpty()
  methodology: string;

  @ApiProperty({ description: 'Vintage start date (ISO 8601)', example: '2023-01-01' })
  @IsString()
  @IsNotEmpty()
  vintageStart: string;

  @ApiProperty({ description: 'Vintage end date (ISO 8601)', example: '2023-12-31' })
  @IsString()
  @IsNotEmpty()
  vintageEnd: string;

  @ApiProperty({ description: 'Total tonnes CO2e', example: 10000 })
  @IsNumber()
  @Min(1)
  tonnes: number;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code', example: 'BR' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  geography: string;

  @ApiPropertyOptional({ description: 'Documentation IPFS URLs' })
  @IsOptional()
  documentation?: Record<string, string>;

  @ApiPropertyOptional({ description: 'SDG co-benefit flags', example: [1, 13, 15] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  sdgCobenefits?: number[];

  @ApiPropertyOptional({ description: 'Permanence rating (0-100)', example: 87 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  permanenceRating?: number;

  @ApiPropertyOptional({ description: 'Buffer contribution percentage (0-20)', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  bufferContributionPct?: number;

  @ApiPropertyOptional({ description: 'Additionality type (0=regulatory, 1=investment, 2=common_practice)', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  additionalityType?: number;
}
