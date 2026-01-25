// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { success } from '../response.util';

/**
 * Transform Interceptor
 * Wraps responses in the standard success format if not already wrapped
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // If already wrapped in success/error format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        
        // Wrap in success format
        return success(data);
      }),
    );
  }
}
