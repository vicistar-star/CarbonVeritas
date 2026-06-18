import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChallengeDto } from './dto/challenge.dto';
import { TokenDto } from './dto/token.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('challenge')
  @ApiOperation({ summary: 'Generate SEP-10 challenge transaction' })
  async challenge(@Body() dto: ChallengeDto) {
    return this.authService.generateChallenge(dto.wallet);
  }

  @Public()
  @Post('token')
  @ApiOperation({ summary: 'Exchange signed challenge for JWT' })
  async token(@Body() dto: TokenDto) {
    return this.authService.exchangeToken(dto.wallet, dto.signedChallenge);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh expired JWT using refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
