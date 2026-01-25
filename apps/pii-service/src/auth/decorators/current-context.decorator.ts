// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtContext } from '../strategies/jwt.strategy';

export const CurrentContext = createParamDecorator(
  (data: keyof JwtContext | undefined, ctx: ExecutionContext): JwtContext | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const context = request.user as JwtContext;

    return data ? context?.[data] : context;
  },
);
