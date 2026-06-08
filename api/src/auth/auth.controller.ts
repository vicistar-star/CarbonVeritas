import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChallengeDto } from './dto/challenge.dto';
import { TokenDto } from './dto/token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  @ApiOperation({ summary: 'Generate SEP-10 challenge transaction' })
  async challenge(@Body() dto: ChallengeDto) {
    return this.authService.generateChallenge(dto.wallet);
  }

  @Post('token')
  @ApiOperation({ summary: 'Exchange signed challenge for JWT' })
  async token(@Body() dto: TokenDto) {
    return this.authService.exchangeToken(dto.wallet, dto.signedChallenge);
  }
}
