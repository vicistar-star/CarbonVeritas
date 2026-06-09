import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCreditDto {
  @ApiPropertyOptional({ description: 'Verifier comments', example: 'All MRV documentation verified on-site.' })
  @IsOptional()
  @IsString()
  comments?: string;
}
