import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req || !req.method) {
      return next.handle();
    }

    const { method, url, ip } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const statusCode = res ? res.statusCode : 200;
        const delay = Date.now() - now;
        this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms [${ip}]`);
      }),
    );
  }
}
