// SPDX-License-Identifier: Apache-2.0
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  tenantSchema: string;
  email: string;
  username: string;
}

/**
 * @CurrentUser() decorator
 * Extracts the authenticated user from the request
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user: AuthenticatedUser }).user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  }
);
