import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route: string = request.route?.path ?? request.originalUrl ?? 'unknown';
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(method, route, request.res?.statusCode ?? 200, started);
        },
        error: () => {
          this.record(method, route, request.res?.statusCode ?? 500, started);
        },
      }),
    );
  }

  private record(
    method: string,
    route: string,
    status: number,
    started: number,
  ): void {
    const labels = { method, route, status };
    this.metrics.incrementCounter('http_requests_total', labels);
    this.metrics.observeHistogram('http_request_duration_ms', Date.now() - started, labels);
  }
}
