import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVerifierDto {
  @ApiProperty({ description: 'Stake amount in native tokens', example: 50000 })
  @IsNumber()
  @Min(1)
  stake: number;

  @ApiPropertyOptional({ description: 'Optional credentials or reference URL' })
  @IsOptional()
  @IsString()
  credentials?: string;
}
