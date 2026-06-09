import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCreditDto {
  @ApiProperty({ description: 'Rejection reason', example: 'Insufficient MRV documentation; baseline methodology not justified.' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
