import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Keypair,
  Networks,
  StrKey,
  TransactionBuilder,
  WebAuth,
} from '@stellar/stellar-sdk';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_CHALLENGE_TIMEOUT_SECONDS = 300;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getNetworkPassphrase(): string {
    return (
      this.config.get<string>('STELLAR_NETWORK_PASSPHRASE') ??
      Networks.TESTNET
    );
  }

  private getServerKeypair(): Keypair {
    const secret = this.config.get<string>('SEP10_SIGNING_KEY');
    if (!secret) {
      throw new UnauthorizedException('SEP-10 signing key not configured');
    }
    try {
      return Keypair.fromSecret(secret);
    } catch {
      throw new UnauthorizedException('Invalid SEP-10 signing key');
    }
  }

  private getHomeDomain(): string {
    return (
      this.config.get<string>('SEP10_HOME_DOMAIN') ??
      'api.carbonveritas.io'
    );
  }

  private getChallengeTimeoutSeconds(): number {
    const raw = this.config.get<string>('SEP10_CHALLENGE_TIMEOUT');
    const parsed = raw ? parseInt(raw, 10) : DEFAULT_CHALLENGE_TIMEOUT_SECONDS;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_CHALLENGE_TIMEOUT_SECONDS;
  }

  async generateChallenge(wallet: string): Promise<{
    challengeId: string;
    transaction: string;
    network: string;
    homeDomain: string;
    expiresIn: number;
  }> {
    if (!StrKey.isValidEd25519PublicKey(wallet)) {
      throw new BadRequestException('Invalid Stellar public key');
    }

    const server = this.getServerKeypair();
    const homeDomain = this.getHomeDomain();
    const networkPassphrase = this.getNetworkPassphrase();
    const timeoutSeconds = this.getChallengeTimeoutSeconds();

    const transaction = WebAuth.buildChallengeTx(
      server,
      wallet,
      homeDomain,
      timeoutSeconds,
      networkPassphrase,
      homeDomain,
    );

    await this.prisma.challenge.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
    });

    const challenge = await this.prisma.challenge.create({
      data: {
        wallet,
        transaction,
        expiresAt: new Date(Date.now() + timeoutSeconds * 1000),
      },
    });

    this.logger.log(`SEP-10 challenge issued: id=${challenge.id}, wallet=${wallet}`);

    return {
      challengeId: challenge.id,
      transaction,
      network: this.config.get<string>('STELLAR_NETWORK') ?? 'testnet',
      homeDomain,
      expiresIn: timeoutSeconds,
    };
  }

  async exchangeToken(
    wallet: string,
    signedChallenge: string,
    challengeId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!StrKey.isValidEd25519PublicKey(wallet)) {
      throw new BadRequestException('Invalid Stellar public key');
    }

    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new UnauthorizedException('Unknown challenge');
    }
    if (challenge.wallet !== wallet) {
      throw new UnauthorizedException('Challenge belongs to a different wallet');
    }
    if (challenge.usedAt) {
      throw new UnauthorizedException('Challenge has already been used');
    }
    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('Challenge has expired');
    }

    const server = this.getServerKeypair();
    const homeDomain = this.getHomeDomain();
    const networkPassphrase = this.getNetworkPassphrase();
    const timeoutSeconds = this.getChallengeTimeoutSeconds();

    let verifiedSigners: string[];
    try {
      verifiedSigners = WebAuth.verifyChallengeTxSigners(
        signedChallenge,
        server.publicKey(),
        networkPassphrase,
        [wallet],
        homeDomain,
        homeDomain,
      );
    } catch {
      throw new UnauthorizedException('Invalid challenge signature');
    }

    if (!verifiedSigners.includes(wallet)) {
      throw new UnauthorizedException('Challenge was not signed by this wallet');
    }

    try {
      const { clientAccountID } = WebAuth.readChallengeTx(
        signedChallenge,
        server.publicKey(),
        networkPassphrase,
        homeDomain,
        homeDomain,
      );
      if (clientAccountID !== wallet) {
        throw new UnauthorizedException('Challenge transaction is not bound to this wallet');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid challenge transaction');
    }

    const parsed = TransactionBuilder.fromXDR(signedChallenge, networkPassphrase);
    if ('timeBounds' in parsed) {
      const { timeBounds } = parsed as { timeBounds?: { minTime?: string; maxTime?: string } };
      const now = Math.floor(Date.now() / 1000);
      if (timeBounds?.maxTime && now > Number(timeBounds.maxTime)) {
        throw new UnauthorizedException('Challenge has expired');
      }
    }

    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: { usedAt: new Date() },
    });

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

    this.logger.log(`Authenticated wallet=${wallet}, userId=${user.id}`);

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
