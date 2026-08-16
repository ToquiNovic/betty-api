import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../utils/api-response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    // If it's a websocket or non-HTTP context, pass through
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already an ApiResponseDto, return directly
        if (data && typeof data === 'object' && 'success' in data && 'timestamp' in data) {
          return data;
        }
        return ApiResponseDto.success(data);
      }),
    );
  }
}
