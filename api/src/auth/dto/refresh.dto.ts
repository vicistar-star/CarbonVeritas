import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'JWT refresh token' })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
