import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCertificateDto {
  @ApiProperty({ description: 'Certificate hash to verify against on-chain record' })
  @IsString()
  @IsNotEmpty()
  certificateHash: string;
}
