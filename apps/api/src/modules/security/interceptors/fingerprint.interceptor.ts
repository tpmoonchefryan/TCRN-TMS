// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { FingerprintService } from '../services/fingerprint.service';

@Injectable()
export class FingerprintInterceptor implements NestInterceptor {
  constructor(private readonly fingerprintService: FingerprintService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    // Only inject for authenticated requests
    const user = request.user;
    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        try {
          const tenantId = user.tenant_id || user.tenantId;
          const userId = user.id;

          if (tenantId && userId) {
            const { fingerprint, version } =
              this.fingerprintService.generateVersionedFingerprint(tenantId, userId);

            response.setHeader('X-TCRN-FP', fingerprint);
            response.setHeader('X-TCRN-FP-Version', version);
          }
        } catch {
          // Silent fail - fingerprint is optional
        }
      }),
    );
  }
}
