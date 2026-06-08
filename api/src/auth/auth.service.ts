import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async generateChallenge(wallet: string): Promise<{ challenge: string }> {
    return {
      challenge: `CarbonVeritas SEP-10 challenge for ${wallet} at ${Date.now()}`,
    };
  }

  async exchangeToken(
    wallet: string,
    _signedChallenge: string,
  ): Promise<{ accessToken: string }> {
    let user = await this.prisma.user.findUnique({
      where: { stellarPub: wallet },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { stellarPub: wallet },
      });
    }

    const payload = { sub: user.id, wallet };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
