import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly capacity = 10;
  private readonly refillRate = 1;
  private readonly refillInterval = 1000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip ?? 'unknown';
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refillTokens = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    if (refillTokens > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refillTokens);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.tokens--;
    return true;
  }
}
