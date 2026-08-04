import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const wallet = request.user?.wallet as string | undefined;

    if (!wallet) {
      throw new ForbiddenException('Administrator privileges required');
    }

    const admins = (this.config.get<string>('ADMIN_WALLETS') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!admins.includes(wallet)) {
      throw new ForbiddenException('Administrator privileges required');
    }

    return true;
  }
}
