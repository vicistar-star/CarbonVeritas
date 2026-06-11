import { IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchCertificateDto {
  @ApiProperty({ description: 'Array of credit IDs to generate certificates for', example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayMinSize(1)
  creditIds: number[];
}
