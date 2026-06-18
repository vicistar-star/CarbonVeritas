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
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let user = await this.prisma.user.findUnique({
      where: { stellarPub: wallet },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { stellarPub: wallet },
      });
    }

    const payload = { sub: user.id, wallet };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, wallet, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = this.jwtService.verify(token);
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const payload = { sub: decoded.sub, wallet: decoded.wallet };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
      const refreshToken = this.jwtService.sign(
        { sub: decoded.sub, wallet: decoded.wallet, type: 'refresh' },
        { expiresIn: '7d' },
      );
      return { accessToken, refreshToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
