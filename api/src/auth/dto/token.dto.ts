import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty({ description: 'Stellar public key' })
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @ApiProperty({ description: 'Signed challenge transaction XDR' })
  @IsString()
  @IsNotEmpty()
  signedChallenge: string;
}
