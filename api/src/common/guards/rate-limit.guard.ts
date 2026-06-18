import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/public.decorator';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly unauthenticatedCapacity = 100;
  private readonly authenticatedCapacity = 1000;
  private readonly refillRate = 1;
  private readonly refillInterval = 1000;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const capacity = isPublic || !request.user
      ? this.unauthenticatedCapacity
      : this.authenticatedCapacity;

    const key = request.user?.wallet ?? request.ip ?? 'unknown';
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refillTokens = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    if (refillTokens > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + refillTokens);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.tokens--;
    request.rateLimit = { remaining: bucket.tokens, limit: capacity };
    return true;
  }
}
